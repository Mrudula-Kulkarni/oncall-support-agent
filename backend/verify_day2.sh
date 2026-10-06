#!/usr/bin/env bash
# Checks for the Triage + Reporter phase. Run from backend/.
#
#     ./verify_day2.sh
#
# Separate from verify_day1.sh because every check here spends Groq calls, and Day 1's
# checks are free and should stay runnable on every edit.
#
# Exits non-zero if anything fails. What it cannot check is whether the summaries are any
# GOOD — see "by judgment" in DAY2_PLAN.md.

set -uo pipefail
cd "$(dirname "$0")"

PY=./.venv/bin/python
PORT=${PORT:-8000}
fails=0

pass() { printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fails=$((fails + 1)); }
head() { printf '\n\033[1m%s\033[0m\n' "$1"; }

check() { # check <label> <expected-substring> <command...>
  local label=$1 want=$2; shift 2
  local out; out=$("$@" 2>&1)
  if [[ "$out" == *"$want"* ]]; then pass "$label"; else
    fail "$label"; printf '        wanted %q in:\n%s\n' "$want" "${out//$'\n'/$'\n'        }"
  fi
}

head "wiring"
[[ -x $PY ]] || { fail "no venv at $PY"; exit 1; }
check "langchain-groq installed" "langchain-groq" bash -c "$PY -m pip list 2>/dev/null | grep -i '^langchain-groq '"
check "agents import"            "ok" $PY -c 'from app.agents.triage import run_triage; from app.agents.reporter import run_reporter; print("ok")'
check "GROQ_MODEL reachable"     "ok" $PY -c '
from app.llm import get_llm, model_name
get_llm().invoke("say ok")   # a 404 here means GROQ_MODEL no longer exists on Groq
print("ok", model_name())'

head "triage withholds the answer"
# alert.type holds the category Triage must produce. If it ever reaches the prompt, the eval
# is scoring a field copy. This asserts the allowlist still excludes it.
check "alert.type not in prompt" "ok" $PY -c '
from app.agents.triage import VISIBLE_FIELDS, _visible_alert
from app.data_access import load_alert
assert "type" not in VISIBLE_FIELDS, "type is in VISIBLE_FIELDS"
body = _visible_alert(load_alert("alrt_010"))
assert "failed_deploy" not in body, "the category leaked into the prompt body"
print("ok")'

head "pipeline"
# Asserts the CURRENT pipeline contract, all four agents. Earlier versions of this check
# pinned stages to "null until a later phase", which silently went stale the moment that phase
# landed — remediation and the route surface both did exactly that.
check "run_pipeline populates every stage" "ok" $PY -c '
from app.pipeline import run_pipeline, CONFIDENCE_THRESHOLD
r = run_pipeline("alrt_001")
assert r.triage is not None,        "triage missing"
assert r.investigation is not None, "investigation missing"
assert 0.0 <= r.investigation.confidence <= 1.0, "confidence out of range"
assert r.report.summary_markdown,   "empty summary"
assert r.duration_ms and r.duration_ms > 0, "duration_ms not recorded"
# Remediation runs unless the run escalated — that branch is the §4.2 contract.
escalated = r.investigation.confidence < CONFIDENCE_THRESHOLD
assert r.escalated_to_human == escalated, "escalated_to_human disagrees with the threshold"
if escalated:
    assert r.remediation is None, "remediation ran on an escalated run"
else:
    assert r.remediation is not None, "remediation missing on a confident run"
    assert r.remediation.suggested_fix, "empty suggested_fix"
print("ok")'

# The Reporter invented "escalated to a senior engineer" on its first run, with nothing
# escalated. That is the failure that would embarrass a demo, so it is pinned here.
check "reporter invents no escalation" "ok" $PY -c '
from app.pipeline import run_pipeline
r = run_pipeline("alrt_001")
text = r.report.summary_markdown.lower()
assert not r.escalated_to_human, "fixture assumption changed"
for word in ("escalat", "paged", "senior engineer", "on-call is", "team is"):
    assert word not in text, f"reporter claimed {word!r} with nothing escalated"
print("ok")'

# Each section must match whether its input is present, and Status must not contradict the
# sections above it — the Reporter once named a file under "Where it originates" while Status
# still read "investigation has not run yet".
check "reporter sections match inputs" "ok" $PY -c '
from app.pipeline import run_pipeline
r = run_pipeline("alrt_006")
text = r.report.summary_markdown.lower()
if r.investigation and r.investigation.suspected_file:
    assert "has not been identified" not in text, \
        "Status contradicts the located file above it"
if r.remediation:
    assert "suggested fix" in text, "remediation ran but the report has no fix section"
else:
    assert "suggested fix" not in text, "reporter wrote a fix section with no remediation data"
print("ok")'

head "http surface"
$PY -m uvicorn app.main:app --port "$PORT" >/tmp/verify_day2_uvicorn.log 2>&1 &
server=$!
trap 'kill $server 2>/dev/null' EXIT
if curl -s --retry 20 --retry-delay 1 --retry-connrefused -o /dev/null "localhost:$PORT/health"; then
  check "GET /scenarios returns 12" "12" bash -c "curl -s localhost:$PORT/scenarios | $PY -c 'import json,sys; print(len(json.load(sys.stdin)))'"
  check "POST /run returns a report" "ok" bash -c "
    curl -s -X POST localhost:$PORT/run -H 'Content-Type: application/json' -d '{\"alert_id\":\"alrt_003\"}' \
    | $PY -c \"
import json,sys
r=json.load(sys.stdin)
assert r['triage']['category'], 'no category'
assert r['report']['summary_markdown'], 'no summary'
assert r['duration_ms'] > 0, 'no duration'
print('ok')\""
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "localhost:$PORT/run" \
         -H 'Content-Type: application/json' -d '{"alert_id":"alrt_999"}')
  [[ $code == 404 ]] && pass "unknown alert_id -> 404" || fail "unknown alert_id -> got $code, wanted 404"
else
  fail "server never came up — see /tmp/verify_day2_uvicorn.log"
fi

if (( fails )); then printf '\n\033[31m%d check(s) failed\033[0m\n' "$fails"; exit 1; fi
printf '\n\033[32mall mechanical checks passed\033[0m\n'
printf 'Still needs your judgment — read a summary and decide:\n'
printf '  ./.venv/bin/python -c "from app.pipeline import run_pipeline; print(run_pipeline(\x27alrt_006\x27).report.summary_markdown)"\n'
printf '  ./.venv/bin/python eval_triage.py -v     # severity has no ground truth; judge it\n'
