"""Wires the agents into one run.

A straight function call for now. Spec §9.5 replaces this with LangGraph once there is a
confidence score to branch on — that arrives with the Investigator. Keeping the stage order
and the `PipelineResult` shape stable here means the LangGraph version is a swap of the
orchestration, not a rewrite of what the API returns.

`duration_ms` is measured because spec §8 lists end-to-end latency as one of the few
defensible metrics this project can report.
"""

import time

from . import data_access
from .agents.investigator import run_investigator
from .agents.remediation import run_remediation
from .agents.reporter import run_reporter
from .agents.triage import run_triage
from .models import PipelineResult

# Below this, the Investigator's hypothesis is treated as too weak to remediate from and the
# run escalates to a human instead (spec §4.2).
CONFIDENCE_THRESHOLD = 0.5


def run_pipeline(alert_id: str) -> PipelineResult:
    """Run every stage that exists for one scenario.

    Raises data_access.ScenarioNotFound for an unknown alert_id.
    """
    started = time.perf_counter()
    alert = data_access.load_alert(alert_id)

    triage = run_triage(alert)
    investigation = run_investigator(alert, triage)

    # Spec §4.2: below the threshold the hypothesis is too weak to build a fix on, so the run
    # escalates to a human and remediation is skipped. The Reporter still runs either way —
    # a human being asked to take over needs the summary more, not less.
    escalated = investigation.confidence < CONFIDENCE_THRESHOLD

    # Skipped on escalation, by design. Spec §4.2: a fix built on a hypothesis the pipeline
    # does not believe is worse than no fix, because it reads as authoritative. The Reporter is
    # told remediation is absent rather than handed an empty object it might present as "a fix
    # was considered and none was found".
    remediation = (
        None if escalated else run_remediation(alert, triage, investigation)
    )

    report = run_reporter(
        alert,
        triage=triage,
        investigation=investigation,
        remediation=remediation,
        escalated_to_human=escalated,
    )

    return PipelineResult(
        alert=alert,
        triage=triage,
        investigation=investigation,
        remediation=remediation,
        report=report,
        escalated_to_human=escalated,
        duration_ms=int((time.perf_counter() - started) * 1000),
    )
