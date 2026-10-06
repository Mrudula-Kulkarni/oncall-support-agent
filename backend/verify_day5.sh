#!/usr/bin/env bash
# Checks for the MCP server phase. Run from backend/.
#
#     ./verify_day5.sh
#
# Spends no Groq calls. Everything here is transport and parity.

set -uo pipefail
cd "$(dirname "$0")"

PY=./.venv/bin/python
fails=0

pass() { printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fails=$((fails + 1)); }
head() { printf '\n\033[1m%s\033[0m\n' "$1"; }

check() {
  local label=$1 want=$2; shift 2
  local out; out=$("$@" 2>&1)
  if [[ "$out" == *"$want"* ]]; then pass "$label"; else
    fail "$label"; printf '        wanted %q in:\n%s\n' "$want" "${out//$'\n'/$'\n'        }"
  fi
}

head "server"
check "mcp installed" "ok" $PY -c 'import mcp; print("ok", mcp.__name__)'
check "server module imports" "ok" $PY -c 'from mcp_server.server import mcp; print("ok")'
check "exposes exactly the three §6 tools" "ok" $PY -c '
import asyncio, sys
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
async def main():
    p = StdioServerParameters(command=sys.executable, args=["-m","mcp_server.server"], cwd=".")
    async with stdio_client(p) as (r, w):
        async with ClientSession(r, w) as s:
            await s.initialize()
            names = sorted(t.name for t in (await s.list_tools()).tools)
            assert names == ["fetch_logs", "get_recent_deploys", "get_runbook"], names
            print("ok")
asyncio.run(main())'

head "parity: MCP returns what in-process returns"
# The whole point of the toggle. If the two paths disagree, USE_MCP_TOOLS silently changes
# what the agents see, and the eval numbers stop meaning the same thing.
check "logs, deploys and runbook identical" "ok" env USE_MCP_TOOLS=1 $PY -c '
from app import tools
assert tools.use_mcp(), "USE_MCP_TOOLS not picked up"
for direct, viamcp, arg in [
    (tools._fetch_logs, tools.fetch_logs, "checkout-service"),
    (tools._get_recent_deploys, tools.get_recent_deploys, "payment-service"),
    (tools._get_runbook, tools.get_runbook, "latency_spike"),
]:
    a, b = direct(arg), viamcp(arg)
    assert a == b, f"{viamcp.__name__}({arg!r}) differs between transports"
print("ok")'
check "missing data degrades the same way" "ok" env USE_MCP_TOOLS=1 $PY -c '
from app import tools
assert tools.fetch_logs("no-such-service") == [], "expected [] for an unknown service"
assert tools.get_recent_deploys("no-such-service") == [], "expected [] for an unknown service"
assert tools.get_runbook("no-such-category") is None, "expected None for an unknown category"
print("ok")'

head "wiring"
# Spec §6 says the agents call these through the tool interface, not the fixture reader.
check "agents use tools, not data_access" "ok" bash -c '
if grep -q "data_access" app/agents/*.py; then
  echo "an agent still reads data_access directly"; exit 1
fi
grep -q "tools.fetch_logs" app/agents/investigator.py || { echo "investigator not using tools"; exit 1; }
grep -q "tools.get_runbook" app/agents/remediation.py || { echo "remediation not using tools"; exit 1; }
echo ok'
# §10: code lookup deliberately does NOT go through MCP — a protocol layer there would add a
# dependency without adding capability.
check "repo search stays a direct search" "ok" $PY -c '
import ast, pathlib
# The docstring explains WHY code lookup is not MCP-backed, so grep for the word would match
# the prose. Check the imports instead: no mcp or tools dependency is the actual invariant.
tree = ast.parse(pathlib.Path("app/repo_search.py").read_text())
imported = set()
for node in ast.walk(tree):
    if isinstance(node, ast.Import):
        imported.update(a.name.split(".")[0] for a in node.names)
    elif isinstance(node, ast.ImportFrom) and node.module:
        imported.add(node.module.split(".")[0])
    elif isinstance(node, ast.ImportFrom):
        imported.update(a.name for a in node.names)
banned = imported & {"mcp", "tools", "mcp_server"}
assert not banned, f"repo_search imports {banned} — code lookup is a direct search (spec §10)"
print("ok")'
check "in-process is the default" "ok" $PY -c '
import os
assert not os.environ.get("USE_MCP_TOOLS"), "unset it before running this check"
from app import tools
assert tools.use_mcp() is False, "MCP should be opt-in, not the default"
print("ok")'

if (( fails )); then printf '\n\033[31m%d check(s) failed\033[0m\n' "$fails"; exit 1; fi
printf '\n\033[32mall mechanical checks passed\033[0m\n'
printf 'The server is a real artifact — point any MCP client at it:\n'
printf '  ./.venv/bin/python -m mcp_server.server\n'
printf 'And the pipeline can run through it end to end:\n'
printf '  USE_MCP_TOOLS=1 ./.venv/bin/python -c "from app.pipeline import run_pipeline; print(run_pipeline(\x27alrt_009\x27).investigation.suspected_file)"\n'
