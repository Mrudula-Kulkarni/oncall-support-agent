"""MCP server exposing the operational lookups the agents share (spec §6).

Three tools over the synthetic data:

    fetch_logs(service_id)          the log entries for one service
    get_recent_deploys(service_id)  its deploy history
    get_runbook(category)           the runbook for an alert category, if one exists

**Why these three and not code search.** Spec §10: logs, deploys and runbooks are the kind of
operational lookup several agents share, so a reusable tool interface fits. Locating a file is a
plain repo search that gains nothing from a protocol layer, so `repo_search.py` stays a direct
search. The boundary is about whether the capability is shared and reusable, not about whether a
thing is technically callable.

Built against mcp 2.x, where `FastMCP` was renamed `MCPServer`.

Run it standalone over stdio:

    ./.venv/bin/python -m mcp_server.server

That makes it usable from any MCP client — the inspector, Claude Desktop — which is the point of
building it as a server rather than a wrapper: the tools are inspectable from outside this
project.

The pipeline reaches these through `app/tools.py`, which calls the same functions in-process by
default. See that module for why.
"""

import json

from mcp.server.mcpserver import MCPServer

from app import data_access

mcp = MCPServer("oncall-support-agent")


@mcp.tool()
def fetch_logs(service_id: str) -> str:
    """Return the log entries for one service, oldest first.

    A service's log covers more than one incident, so entries unrelated to the alert under
    investigation are expected and are part of the task.

    Args:
        service_id: e.g. "checkout-service", "payment-service".
    """
    entries = data_access.load_logs(service_id)
    if not entries:
        return f"No logs for service_id {service_id!r}."
    return json.dumps(entries, indent=2)


@mcp.tool()
def get_recent_deploys(service_id: str) -> str:
    """Return the recent deploy history for one service.

    The deploy that introduced a fault is present but never flagged — correlating it is the
    caller's job, and for a gradual fault such as a leak it may be days old rather than the
    most recent entry.

    Args:
        service_id: e.g. "inventory-service".
    """
    deploys = data_access.load_deploys(service_id)
    if not deploys:
        return f"No deploy history for service_id {service_id!r}."
    return json.dumps(deploys, indent=2)


@mcp.tool()
def get_runbook(category: str) -> str:
    """Return the runbook for an alert category, if one exists.

    Args:
        category: one of latency_spike, service_down, error_rate_spike, failed_deploy,
            high_severity_escalation.
    """
    runbook = data_access.load_runbook(category)
    return runbook or f"No runbook for category {category!r}."


if __name__ == "__main__":
    mcp.run()
