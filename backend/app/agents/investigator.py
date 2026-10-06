"""Investigator agent (spec §4.2): locate the code that caused the alert.

Three steps, only the last of which is an LLM call:

  1. fetch logs and deploy history through `tools` (spec §6's MCP-backed interface)
  2. rank candidate files from that evidence via `repo_search` — deterministic, no model
  3. hand the candidates, their source and the evidence to the model, which picks one and
     explains why

The split matters for debugging. `repo_search` has been checked to always include the correct
file among the candidates (worst rank 3 of 5 across the labelled set), so a wrong answer is the
model choosing badly rather than the search hiding the answer.

`reasoning_effort` is "medium" here. Triage and Reporter classify and summarise, which "low"
handles; this agent has to hold a symptom, a mechanism and several files at once, and it is the
one place in the pipeline where deliberation is worth the latency. That latency is real — around
27s per call against ~1s for the other two — and DAY3_PLAN.md records the options for cutting it.
Lower it via the argument rather than editing this call, so the eval can measure the trade.
"""

from .. import repo_search, tools
from ..llm import get_llm
from ..models import Alert, InvestigatorOutput, TriageOutput

SYSTEM_PROMPT = """\
You are the investigation step of an on-call incident response pipeline. You are given one \
alert, its triage classification, the service's logs, its recent deploy history, and the source \
of every candidate file. Name the file and function where the fault actually lives.

The single rule that matters: pick the file whose SOURCE CODE produces the observed symptom. \
Appearing in a stack trace is a hint, not the answer. Confirm the mechanism by reading the code \
before you commit to a file.

Traps in this kind of evidence, all of which occur here:

- **The top stack frame is usually the request entry point, not the fault.** A trace that \
starts in an API handler and ends deeper has the defect at the DEEPEST frame. Report where the \
bad code is, not where the request came in.
- **A resource symptom has no stack trace at all.** Memory climbing, a growing cache, a rising \
queue: nothing raises, so nothing is traced. Find the code that ACCUMULATES — a container that \
is written but never evicted, a collection that only grows. A declared TTL or size limit that \
no code path enforces is a defect, not a safeguard.
- **A gradual fault's introducing deploy can be old.** Do not assume the most recent deploy is \
responsible. A leak introduced a week ago only alerts when it fills the limit. Match the deploy \
whose SUMMARY describes introducing the mechanism you found, whatever its age.
- **The nearest traced file may belong to a different incident.** A service's log holds several \
incidents. Use the entries whose symptoms match THIS alert.
- **A count that disagrees with itself localises the bug precisely.** `received=500 \
written=499` means a loop is skipping an element. Find the loop.

`suspected_function` must be a function or class actually defined in `suspected_file`. Report \
the function containing the defect, not the one that calls it. If the defect is at MODULE SCOPE \
rather than inside any function — a misconfigured constant, a client constructed at import time \
— name the module-level binding it is assigned to, not the function that suffers from it. Never \
leave it empty once you have named a file.

`evidence` is 2-4 short strings, each a specific observation you used — a log line, a metric, a \
deploy summary, or a line of source. No generalities.

`confidence` is your probability that this file and function are correct:
- 0.85-1.0  the source plainly contains the defect and the evidence names it directly
- 0.6-0.85  the mechanism is confirmed in the source, inferred rather than named outright
- 0.4-0.6   a plausible mechanism, but competing candidates are not ruled out
- below 0.4 no candidate's source explains the symptom
Below 0.5 the pipeline escalates to a human instead of proposing a fix, so do not inflate it \
to seem useful. An honest 0.45 is more valuable than a false 0.8."""


def _format_logs(logs: list[dict]) -> str:
    out = []
    for e in logs:
        out.append(f"[{e['timestamp']}] {e['level']} {e['logger']}: {e['message']}")
        if e.get("trace"):
            out.append("    " + e["trace"].replace("\n", "\n    "))
    return "\n".join(out)


def _format_deploys(deploys: list[dict]) -> str:
    return "\n".join(
        f"{d['deploy_id']}  {d['timestamp']}  by {d['author']}\n"
        f"    {d['summary']}\n"
        f"    changed: {', '.join(d['changed_files'])}"
        for d in deploys
    )


def _format_candidates(candidates: list[dict]) -> str:
    out = []
    for i, c in enumerate(candidates, 1):
        when = (
            f", {abs(c['seconds_from_alert'])}s "
            f"{'before' if c['seconds_from_alert'] < 0 else 'after'} the alert"
            if c["seconds_from_alert"] is not None
            else ""
        )
        out.append(
            f"--- CANDIDATE {i}: {c['path']}\n"
            f"    why offered: {c['evidence']} — {c['detail']}{when}\n"
            f"```python\n{repo_search.read_source(c['path'])}```"
        )
    return "\n\n".join(out)


def run_investigator(alert: Alert, triage: TriageOutput) -> InvestigatorOutput:
    """Locate the fault for one alert. Raises if the model returns something off-contract."""
    # Through the shared tool interface (spec §6), not the fixture reader directly.
    logs = tools.fetch_logs(alert.service_id)
    deploys = tools.get_recent_deploys(alert.service_id)
    candidates = repo_search.candidate_files(alert.service_id, logs, deploys, alert.timestamp)

    context = f"""\
ALERT {alert.alert_id} at {alert.timestamp}
service: {alert.service_id}
{alert.message}
metrics: {alert.metric}

TRIAGE
severity={triage.severity.value} category={triage.category.value}
{triage.short_reason}

LOGS for {alert.service_id} (oldest first; may cover more than one incident)
{_format_logs(logs)}

DEPLOY HISTORY for {alert.service_id}
{_format_deploys(deploys)}

CANDIDATE FILES, ranked by strength of evidence — the answer is among them
{_format_candidates(candidates)}"""

    llm = get_llm(reasoning_effort="medium").with_structured_output(InvestigatorOutput)
    result = llm.invoke([("system", SYSTEM_PROMPT), ("human", context)])

    # Two ways the symbol can come back unusable, both worth surfacing rather than passing on
    # as a confident-looking answer. A file located without a function is a partial result.
    if result.suspected_file:
        defined = repo_search.defined_symbols(
            result.suspected_file.replace("sample_repo/", "")
        )
        # A method reported as Class.method is the same answer as method.
        if result.suspected_function:
            result.suspected_function = repo_search.normalise_symbol(result.suspected_function)
        if not result.suspected_function:
            result.evidence.append(
                f"note: no function reported for {result.suspected_file}; defined there are "
                f"{', '.join(defined)}"
            )
            result.confidence = min(result.confidence, 0.6)
        elif defined and result.suspected_function not in defined:
            result.evidence.append(
                f"note: reported function '{result.suspected_function}' is not defined in "
                f"{result.suspected_file}; defined there are {', '.join(defined)}"
            )
            result.confidence = min(result.confidence, 0.4)

    return result
