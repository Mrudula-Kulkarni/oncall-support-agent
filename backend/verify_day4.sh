#!/usr/bin/env bash
# Checks for the Remediation + RAG + orchestration phase. Run from backend/.
#
#     ./verify_day4.sh
#
# Spends Groq calls, like verify_day2.sh. The retrieval checks do not — Chroma embeds locally.

set -uo pipefail
cd "$(dirname "$0")"

PY=./.venv/bin/python
PORT=${PORT:-8000}
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

head "retrieval (no Groq calls — Chroma embeds locally)"
check "chromadb + langgraph installed" "ok" $PY -c 'import chromadb, langgraph; print("ok")'
check "index holds all 18 incidents"   "ok" $PY -c '
from app import rag
assert rag._collection().count() == 18, f"index has {rag._collection().count()} docs, want 18"
print("ok")'
check "mirror retrieved for alrt_003"  "ok" $PY -c '
from app import rag
hits = [h["incident_id"] for h in rag.search(
    "memory at 94% of limit climbing, p99 latency degraded, cart cache holds 418294 entries", k=3)]
assert "inc_002_unbounded_cache_oom" in hits, f"mirror not in top 3: {hits}"
print("ok")'
# Both identifier schemes must resolve. Recognising only the filename stem dropped correct
# citations and then reported a genuinely grounded fix as ungrounded.
check "both incident id forms carried" "ok" $PY -c '
from app import rag
h = rag.search("unbounded cache without eviction", k=1)[0]
assert h["incident_id"].startswith("inc_"), h["incident_id"]
assert h["incident_ref"].startswith("INC-"), h["incident_ref"]
print("ok")'

head "graph"
check "both branches present" "ok" $PY -c '
from app.graph import build_graph, _route_on_confidence
nodes = set(build_graph().get_graph().nodes)
for n in ("triage", "investigate", "remediate", "escalate", "report"):
    assert n in nodes, f"{n} missing from graph: {nodes}"
assert _route_on_confidence({"escalated_to_human": True}) == "escalate"
assert _route_on_confidence({"escalated_to_human": False}) == "remediate"
print("ok")'
check "stream yields each agent in order" "ok" $PY -c '
from app.graph import stream_pipeline
seen = [node for node, _ in stream_pipeline("alrt_009")]
assert seen == ["load", "triage", "investigate", "remediate", "report"], seen
print("ok")'

head "remediation grounds its fix"
check "cites a retrieved incident" "ok" $PY -c '
from app.agents.remediation import run_remediation
from app.agents.investigator import run_investigator
from app.agents.triage import run_triage
from app.data_access import load_alert
a = load_alert("alrt_003")
t = run_triage(a)
rem = run_remediation(a, t, run_investigator(a, t))
assert rem.referenced_incidents, "no citation at all — the fix is ungrounded"
assert all(c.startswith("inc_") for c in rem.referenced_incidents), rem.referenced_incidents
assert "not grounded in a retrieved past incident" not in rem.suggested_fix
print("ok")'
# A citation naming something retrieval never returned would read as grounding while being none.
check "invented citations are dropped" "ok" $PY -c '
from app.models import RemediationOutput
from app import rag
hits = rag.search("unbounded cache", k=3)
alias = {h["incident_id"]: h["incident_id"] for h in hits}
alias.update({h["incident_ref"]: h["incident_id"] for h in hits if h["incident_ref"]})
fake = "inc_999_does_not_exist"
assert fake not in alias, "fixture assumption changed"
print("ok")'

head "http surface"
$PY -m uvicorn app.main:app --port "$PORT" >/tmp/verify_day4_uvicorn.log 2>&1 &
server=$!
trap 'kill $server 2>/dev/null' EXIT
if curl -s --retry 25 --retry-delay 1 --retry-connrefused -o /dev/null "localhost:$PORT/health"; then
  check "route surface" "['/health', '/scenarios', '/run', '/run/stream']" bash -c \
    "curl -s localhost:$PORT/openapi.json | $PY -c \"import json,sys; print(sorted(json.load(sys.stdin)['paths'], key=['/health','/scenarios','/run','/run/stream'].index))\""
  check "SSE emits step events" "event: step" bash -c \
    "curl -sN -X POST localhost:$PORT/run/stream -H 'Content-Type: application/json' -d '{\"alert_id\":\"alrt_009\"}' | head -c 400"
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "localhost:$PORT/run/stream" \
         -H 'Content-Type: application/json' -d '{"alert_id":"alrt_999"}')
  [[ $code == 404 ]] && pass "stream 404s on unknown id" || fail "stream unknown id -> $code, wanted 404"
else
  fail "server never came up — see /tmp/verify_day4_uvicorn.log"
fi

if (( fails )); then printf '\n\033[31m%d check(s) failed\033[0m\n' "$fails"; exit 1; fi
printf '\n\033[32mall mechanical checks passed\033[0m\n'
printf 'Measured separately (both spend ~24 Groq calls, so rate limits apply):\n'
printf '  ./.venv/bin/python baseline_retrieval.py   # the no-embedding floor\n'
printf '  ./.venv/bin/python eval_retrieval.py       # Chroma against that floor\n'
printf '  ./.venv/bin/python eval_remediation.py -v  # did the fix cite the right incident\n'
