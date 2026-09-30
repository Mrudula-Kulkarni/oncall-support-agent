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
from .agents.reporter import run_reporter
from .agents.triage import run_triage
from .models import PipelineResult

# Below this, the Investigator's hypothesis is treated as too weak to remediate from and the
# run escalates instead (spec §4.2). Unused until the Investigator exists.
CONFIDENCE_THRESHOLD = 0.5


def run_pipeline(alert_id: str) -> PipelineResult:
    """Run every stage that exists for one scenario.

    Raises data_access.ScenarioNotFound for an unknown alert_id.
    """
    started = time.perf_counter()
    alert = data_access.load_alert(alert_id)

    triage = run_triage(alert)

    # Stages 2 and 3 land in later phases. The Reporter is told they are missing rather than
    # being handed empty objects it might read as "investigated, found nothing".
    investigation = None
    remediation = None
    escalated = False

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
