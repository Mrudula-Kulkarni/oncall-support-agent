"""Reads the Day 1 fixtures.

Every filesystem read of the synthetic data goes through here. Spec §6 moves logs, deploys
and runbooks behind an MCP server on Day 5 — keeping those three reads in one module means
that phase swaps out a single file instead of chasing `open()` calls through the agents.

Logs and deploys are unused until the Investigator lands; they live here now so the MCP
boundary is drawn once.
"""

import functools
import json
import pathlib

from .models import Alert

DATA = pathlib.Path(__file__).resolve().parent.parent / "data"


class ScenarioNotFound(KeyError):
    """Raised for an alert_id with no fixture, so the API can answer 404 rather than 500."""


def list_alert_ids() -> list[str]:
    return sorted(p.stem for p in (DATA / "alerts").glob("*.json"))


def load_alert(alert_id: str) -> Alert:
    path = DATA / "alerts" / f"{alert_id}.json"
    if not path.exists():
        raise ScenarioNotFound(alert_id)
    return Alert(**json.loads(path.read_text()))


def list_alerts() -> list[Alert]:
    """Every scenario, for the dashboard's scenario picker (spec §7)."""
    return [load_alert(aid) for aid in list_alert_ids()]


@functools.lru_cache(maxsize=None)
def load_logs(service_id: str) -> list[dict]:
    """Log entries for one service. Fixtures are static, so caching is safe."""
    path = DATA / "logs" / f"{service_id}.json"
    return json.loads(path.read_text()) if path.exists() else []


@functools.lru_cache(maxsize=None)
def load_deploys(service_id: str) -> list[dict]:
    """Deploy history for one service, newest first as authored."""
    path = DATA / "deploys" / f"{service_id}.json"
    return json.loads(path.read_text()) if path.exists() else []


@functools.lru_cache(maxsize=None)
def load_runbook(category: str) -> str | None:
    """The runbook for an alert category, or None when there is no match."""
    path = DATA / "runbooks" / f"{category}.md"
    return path.read_text() if path.exists() else None
