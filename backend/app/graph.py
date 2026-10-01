"""LangGraph orchestration of the four agents (spec §9.5, §10).

A note on why this exists, because the spec's stated reason is weaker than it sounds. §10 says
LangGraph is warranted by "a genuine branching / human-in-the-loop requirement", but that branch
is one comparison against a threshold — `pipeline.py` expresses it in a single conditional and is
easier to read. A graph framework for one `if` would be cargo cult.

What the graph actually buys is **streaming**. Spec §7 wants the dashboard to show each agent's
step and output as the run proceeds, and a straight function can only return once, after 30
seconds of silence. `stream_pipeline()` yields each node's state as it completes, so the UI can
render triage, then the located file, then the fix, as they land. That is a real capability the
function version does not have, and it is the honest answer to "why LangGraph here".

`pipeline.py` is kept as the synchronous path. `POST /run` uses it, the evals use it, and it
stays the reference implementation — two ways to run the same four agents, where the graph adds
observability rather than replacing the logic.
"""

import time
from typing import Annotated, Any, TypedDict

from langgraph.graph import END, StateGraph

from . import data_access
from .agents.investigator import run_investigator
from .agents.remediation import run_remediation
from .agents.reporter import run_reporter
from .agents.triage import run_triage
from .models import PipelineResult
from .pipeline import CONFIDENCE_THRESHOLD


def _keep_last(_current: Any, incoming: Any) -> Any:
    return incoming


class RunState(TypedDict, total=False):
    """What flows between nodes. Mirrors PipelineResult so the final node can just build one."""

    alert_id: Annotated[str, _keep_last]
    alert: Annotated[Any, _keep_last]
    triage: Annotated[Any, _keep_last]
    investigation: Annotated[Any, _keep_last]
    remediation: Annotated[Any, _keep_last]
    report: Annotated[Any, _keep_last]
    escalated_to_human: Annotated[bool, _keep_last]
    started_at: Annotated[float, _keep_last]
    duration_ms: Annotated[int, _keep_last]


def _load(state: RunState) -> RunState:
    return {
        "alert": data_access.load_alert(state["alert_id"]),
        "started_at": time.perf_counter(),
    }


def _triage(state: RunState) -> RunState:
    return {"triage": run_triage(state["alert"])}


def _investigate(state: RunState) -> RunState:
    investigation = run_investigator(state["alert"], state["triage"])
    return {
        "investigation": investigation,
        "escalated_to_human": investigation.confidence < CONFIDENCE_THRESHOLD,
    }


def _remediate(state: RunState) -> RunState:
    return {
        "remediation": run_remediation(
            state["alert"], state["triage"], state["investigation"]
        )
    }


def _escalate(state: RunState) -> RunState:
    """No-op node. It exists so the escalation path is visible in the graph and in the stream
    rather than being an absence the UI has to infer."""
    return {"remediation": None}


def _report(state: RunState) -> RunState:
    report = run_reporter(
        state["alert"],
        triage=state.get("triage"),
        investigation=state.get("investigation"),
        remediation=state.get("remediation"),
        escalated_to_human=state.get("escalated_to_human", False),
    )
    return {
        "report": report,
        "duration_ms": int((time.perf_counter() - state["started_at"]) * 1000),
    }


def _route_on_confidence(state: RunState) -> str:
    """The §4.2 branch: remediate only when the hypothesis is believed."""
    return "escalate" if state.get("escalated_to_human") else "remediate"


def build_graph():
    builder = StateGraph(RunState)
    builder.add_node("load", _load)
    builder.add_node("triage", _triage)
    builder.add_node("investigate", _investigate)
    builder.add_node("remediate", _remediate)
    builder.add_node("escalate", _escalate)
    builder.add_node("report", _report)

    builder.set_entry_point("load")
    builder.add_edge("load", "triage")
    builder.add_edge("triage", "investigate")
    builder.add_conditional_edges(
        "investigate",
        _route_on_confidence,
        {"remediate": "remediate", "escalate": "escalate"},
    )
    builder.add_edge("remediate", "report")
    builder.add_edge("escalate", "report")
    builder.add_edge("report", END)
    return builder.compile()


GRAPH = build_graph()


def _to_result(state: RunState) -> PipelineResult:
    return PipelineResult(
        alert=state["alert"],
        triage=state.get("triage"),
        investigation=state.get("investigation"),
        remediation=state.get("remediation"),
        report=state.get("report"),
        escalated_to_human=state.get("escalated_to_human", False),
        duration_ms=state.get("duration_ms"),
    )


def run_graph(alert_id: str) -> PipelineResult:
    """Run the graph to completion. Equivalent to pipeline.run_pipeline."""
    return _to_result(GRAPH.invoke({"alert_id": alert_id}))


def stream_pipeline(alert_id: str):
    """Yield (node_name, state_update) as each agent finishes.

    This is the reason the graph exists — it lets the §7 dashboard render the reasoning trail as
    it happens instead of waiting out the whole run.
    """
    for chunk in GRAPH.stream({"alert_id": alert_id}, stream_mode="updates"):
        for node, update in chunk.items():
            yield node, update
