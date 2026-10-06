"""Remediation agent (spec §4.3): propose a fix grounded in past incidents.

Retrieval first, then one LLM call. The agent never sees the incident corpus in bulk — it sees
the three nearest cases and the runbook for the category, and its fix has to come from those.

**It only ever suggests.** Nothing here executes, patches or deploys anything, which is the
property that makes the whole project safe to demo. The prompt says so, but the real guarantee is
structural: this module has no write path.

Two honesty constraints are enforced in code rather than trusted to the prompt:

  1. `referenced_incidents` is filtered to ids that were actually retrieved. A fix citing an
     incident the model invented, or one it remembered from pretraining, is not grounded — and
     the citation is the entire claim of this agent.
  2. A fix with no surviving citation is reported as ungrounded rather than presented as
     evidence-based.

`get_runbook(category)` comes through `tools`, the shared interface spec §6 puts behind MCP.
"""

from .. import rag, tools
from ..llm import get_llm
from ..models import (
    Alert,
    InvestigatorOutput,
    RemediationOutput,
    TriageOutput,
)

RETRIEVE_K = 3

SYSTEM_PROMPT = """\
You are the remediation step of an on-call incident response pipeline. You are given a located \
fault, the runbook for its category, and the most similar incidents this team has resolved \
before. Propose the fix.

You SUGGEST ONLY. Nothing you write is executed. Write what a human should do, not a command \
that will be run for them.

Ground the fix in the retrieved incidents. They are the point: this team has solved this shape \
of problem before, and what worked then is better evidence than anything you can invent. For \
each retrieved incident, use its **Fix** section — that is what actually resolved it.

`suggested_fix` is markdown, under 180 words. Use short paragraphs and at most one fenced code \
block, placed at the TOP LEVEL — never indented inside a numbered or bulleted list, because a \
fence nested in a list item renders as one broken block per line. Prefer describing the change \
in prose; include code only when the exact edit is not otherwise clear, and keep it to a few \
lines rather than a full rewrite of the function.

Structure it as:
- the change to make, specifically enough to act on: which file, which function, what to alter. \
Name the mechanism, not the symptom.
- how it was fixed before, naming the incident it comes from.
- any step the runbook requires that the code change does not cover — clearing accumulated \
state, restarting workers, a backfill.

`referenced_incidents` lists ONLY the incidents you actually drew on, named by the INCIDENT id \
in its header line (the `inc_...` form), not the identifier inside the document body. Do not cite an incident you did not use. Do not invent an id. If none of the retrieved \
incidents genuinely informed your fix, return an empty list and say in `suggested_fix` that the \
proposal is not grounded in a prior case.

Where a retrieved incident resembles this one only superficially — same category, different \
mechanism — do not force it. One real precedent beats three loose ones."""


def _format_incidents(hits: list[dict]) -> str:
    return "\n\n".join(
        f"--- INCIDENT {h['incident_id']}\n"
        f"    title: {h['title']}\n"
        f"    service: {h['service']}  category: {h['category']}  "
        f"resolved in: {h['resolved_in_minutes']} min  distance: {h['distance']:.3f}\n"
        f"{h['text']}"
        for h in hits
    )


def run_remediation(
    alert: Alert,
    triage: TriageOutput,
    investigation: InvestigatorOutput,
) -> RemediationOutput:
    """Propose a grounded fix. Citations are validated against what retrieval returned."""
    # The query is the Investigator's reasoning, not the raw alert: by this point the mechanism
    # is known, and the mechanism is what matches a past incident.
    query = " ".join(
        filter(
            None,
            [
                investigation.hypothesis,
                investigation.suspected_file,
                investigation.suspected_function,
                *investigation.evidence,
                alert.message,
            ],
        )
    )
    hits = rag.search(query, k=RETRIEVE_K, category=triage.category.value)
    # Accept either name for a retrieved document and normalise to the file stem. The corpus
    # identifies incidents twice over — `inc_002_unbounded_cache_oom` as a filename and
    # `INC-2026-0233` in its own frontmatter — and the model cites the one the document uses
    # for itself. Recognising only the stem dropped correct citations and then reported a
    # genuinely grounded fix as ungrounded.
    alias = {h["incident_id"]: h["incident_id"] for h in hits}
    alias.update({h["incident_ref"]: h["incident_id"] for h in hits if h["incident_ref"]})
    runbook = tools.get_runbook(triage.category.value)

    context = f"""\
LOCATED FAULT
file: {investigation.suspected_file}
function: {investigation.suspected_function}
confidence: {investigation.confidence:.2f}
hypothesis: {investigation.hypothesis}
evidence: {'; '.join(investigation.evidence)}

ALERT
{alert.message}
severity={triage.severity.value} category={triage.category.value}

RUNBOOK for {triage.category.value}
{runbook or '(no runbook for this category)'}

SIMILAR PAST INCIDENTS, nearest first
{_format_incidents(hits)}"""

    llm = get_llm().with_structured_output(RemediationOutput)
    result = llm.invoke([("system", SYSTEM_PROMPT), ("human", context)])

    # Citations must name something retrieval actually returned. A hallucinated or
    # pretraining-recalled id would read as grounding while being nothing of the kind.
    cited = list(dict.fromkeys(alias[i] for i in result.referenced_incidents if i in alias))
    dropped = [i for i in result.referenced_incidents if i not in alias]
    result.referenced_incidents = cited

    if dropped:
        result.suggested_fix += (
            f"\n\n_Note: dropped {len(dropped)} citation(s) that were not among the retrieved "
            f"incidents: {', '.join(dropped)}._"
        )
    if not cited:
        result.suggested_fix += (
            "\n\n_Note: this proposal is not grounded in a retrieved past incident._"
        )

    return result
