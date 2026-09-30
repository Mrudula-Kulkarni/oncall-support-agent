"""Reporter agent (spec §4.4): draft the human-readable incident summary.

Single LLM call. Takes whatever the earlier agents produced and writes the status update a
person reads under time pressure.

It has to degrade honestly. Right now every run reaches it with no investigation and no
remediation, and later runs may arrive with a low-confidence investigation that was escalated
instead of remediated. In both cases the summary must say what is not known rather than imply
a diagnosis the pipeline does not have — a confident-sounding report built on nothing is worse
than an obviously incomplete one.
"""

from ..llm import get_llm
from ..models import (
    Alert,
    InvestigatorOutput,
    RemediationOutput,
    ReporterOutput,
    TriageOutput,
)

SYSTEM_PROMPT = """\
You write the incident status update for an on-call engineer. It will be pasted into a Slack \
channel during a live incident, so it is read in seconds by someone who has just been paged.

Write markdown, under 150 words, in this shape:

**<one-line headline: service, what is failing, severity>**

*What we know* — the observed symptoms, drawn from the alert and triage.
*Where it originates* — the suspected file and function, with the evidence. OMIT THIS SECTION \
ENTIRELY if no investigation was provided.
*Suggested fix* — the proposal and the past incidents it draws on. OMIT ENTIRELY if no \
remediation was provided.
*Status* — what happens next, and explicitly what is not yet known.

Rules that matter more than style:
- Report ONLY what the input below states. You are summarising a pipeline run, not narrating \
an incident response. Never invent a cause, a file, a fix, or an action taken by a person.
- Never claim anyone is doing anything. Do not write that on-call is investigating, that logs \
are being reviewed, that a team has been paged, or that anything was escalated, unless the \
input says so. Inventing a human action makes the reader believe the incident is handled.
- Each section is governed by whether its input is present, and Status must agree with the \
sections above it. Never write both a located file and "the root cause has not been identified".
  - INVESTIGATION present -> write *Where it originates* with that file and function, and \
Status reports the root cause AS IDENTIFIED, with the stated confidence.
  - INVESTIGATION marked (not available) -> omit *Where it originates*, and Status says the \
root cause has not been identified and automated investigation has not run yet.
  - REMEDIATION present -> write *Suggested fix*. Marked (not available) -> omit it, and if an \
investigation exists, Status says no fix has been proposed yet.
- Say a run was escalated to a human ONLY when the input contains an ESCALATED line. Absence \
of that line means it was not escalated — do not mention escalation at all.
- Do not restate the raw alert payload or repeat metric numbers the reader can see. Add the \
interpretation, not the transcript.
- No preamble, no sign-off, no fenced code block. Start with the headline."""


def _section(title: str, body: str | None) -> str:
    return f"{title}:\n{body}\n" if body else f"{title}: (not available)\n"


def run_reporter(
    alert: Alert,
    triage: TriageOutput | None = None,
    investigation: InvestigatorOutput | None = None,
    remediation: RemediationOutput | None = None,
    escalated_to_human: bool = False,
) -> ReporterOutput:
    """Summarise a pipeline run. Missing stages are stated as missing, not filled in."""
    context = [
        _section(
            "ALERT",
            f"service={alert.service_id} at {alert.timestamp}\n{alert.message}",
        ),
        _section(
            "TRIAGE",
            f"severity={triage.severity.value} category={triage.category.value}\n"
            f"{triage.short_reason}"
            if triage
            else None,
        ),
        _section(
            "INVESTIGATION",
            f"file={investigation.suspected_file} function={investigation.suspected_function}\n"
            f"confidence={investigation.confidence:.2f}\n"
            f"hypothesis: {investigation.hypothesis}\n"
            f"evidence: {'; '.join(investigation.evidence)}"
            if investigation
            else None,
        ),
        _section(
            "REMEDIATION",
            f"{remediation.suggested_fix}\n"
            f"grounded in: {', '.join(remediation.referenced_incidents)}"
            if remediation
            else None,
        ),
    ]
    if escalated_to_human:
        context.append(
            "ESCALATED: confidence in the automated analysis was below threshold; "
            "a human must review. Say this in the Status section.\n"
        )

    # Plain call, not with_structured_output. ReporterOutput is a single free-text field, so
    # forcing a tool call buys no validation and adds a failure mode: Groq rejects the request
    # outright ("Tool choice is required, but model did not call a tool") when the model
    # answers in prose instead, which it does once the summary gets long enough.
    response = get_llm().invoke(
        [
            ("system", SYSTEM_PROMPT),
            ("human", "\n".join(context)),
        ]
    )
    text = response.content if isinstance(response.content, str) else str(response.content)
    return ReporterOutput(summary_markdown=text.strip())
