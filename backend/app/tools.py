"""The tool interface the agents call for shared operational lookups.

Every log, deploy and runbook read in the pipeline goes through here, so there is exactly one
place where "how the agents get operational data" is decided. `mcp_server/server.py` exposes the
same three functions over MCP.

**Why the pipeline does not spawn the MCP server per request.** MCP's stdio transport means a
subprocess and a handshake for each session. Adding that to a request path that already takes
tens of seconds, in exchange for data that is read from local JSON, would be latency and a
failure mode bought for nothing. Spec §6 anticipates this — it says the agents "can call the same
functions directly and the MCP layer can be added after" — so the default is in-process and the
MCP path is opt-in via `USE_MCP_TOOLS=1`.

That makes the MCP server a real, runnable artifact rather than a decorative one: it serves the
same three tools to any MCP client, and setting the flag proves the pipeline works through it.
What it is not is a protocol layer inserted into a hot path to look impressive, which would be
the wrong trade and hard to defend.
"""

import asyncio
import json
import os
import pathlib
import sys

from . import data_access

SERVER_MODULE = "mcp_server.server"
BACKEND_ROOT = pathlib.Path(__file__).resolve().parent.parent


def use_mcp() -> bool:
    """Whether to route tool calls through the MCP server rather than calling in-process."""
    return os.environ.get("USE_MCP_TOOLS", "").lower() in {"1", "true", "yes"}


# --------------------------------------------------------------------------------------
# In-process implementations. These are what mcp_server/server.py wraps, so both paths
# return the same data and only the transport differs.
# --------------------------------------------------------------------------------------


def _fetch_logs(service_id: str) -> list[dict]:
    return data_access.load_logs(service_id)


def _get_recent_deploys(service_id: str) -> list[dict]:
    return data_access.load_deploys(service_id)


def _get_runbook(category: str) -> str | None:
    return data_access.load_runbook(category)


# --------------------------------------------------------------------------------------
# MCP path
# --------------------------------------------------------------------------------------


async def _call_over_mcp(tool: str, arguments: dict) -> str:
    """Start the MCP server over stdio, call one tool, return its text content."""
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client

    params = StdioServerParameters(
        command=sys.executable,
        args=["-m", SERVER_MODULE],
        cwd=str(BACKEND_ROOT),
    )
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool(tool, arguments)
            return "".join(
                block.text for block in result.content if getattr(block, "text", None)
            )


def _via_mcp(tool: str, arguments: dict) -> str:
    return asyncio.run(_call_over_mcp(tool, arguments))


# --------------------------------------------------------------------------------------
# What the agents call
# --------------------------------------------------------------------------------------


def fetch_logs(service_id: str) -> list[dict]:
    """Log entries for one service, oldest first."""
    if not use_mcp():
        return _fetch_logs(service_id)
    text = _via_mcp("fetch_logs", {"service_id": service_id})
    return [] if text.startswith("No logs") else json.loads(text)


def get_recent_deploys(service_id: str) -> list[dict]:
    """Deploy history for one service."""
    if not use_mcp():
        return _get_recent_deploys(service_id)
    text = _via_mcp("get_recent_deploys", {"service_id": service_id})
    return [] if text.startswith("No deploy history") else json.loads(text)


def get_runbook(category: str) -> str | None:
    """The runbook for an alert category, or None."""
    if not use_mcp():
        return _get_runbook(category)
    text = _via_mcp("get_runbook", {"category": category})
    return None if text.startswith("No runbook") else text
