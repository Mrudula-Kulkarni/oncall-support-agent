#!/usr/bin/env bash
# Every mechanical check for the Day 1 phase. Run from backend/.
#
#     ./verify_day1.sh
#
# Exits non-zero if anything fails. What it cannot check is whether the data is
# any *good* — see "by judgment" in DAY1_PLAN.md.

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

head "interpreter and dependencies"
[[ -x $PY ]] || { fail "no venv at $PY — run: python3.13 -m venv .venv"; exit 1; }
check "python 3.13"      "3.13"      $PY --version
for pkg in fastapi pydantic uvicorn python-dotenv; do
  check "$pkg installed" "$pkg" bash -c "$PY -m pip list 2>/dev/null | grep -i '^$pkg '"
done

head "data consistency"
check "every label resolves" "OK — every label resolves" $PY verify_data.py

head "code and data agree"
check "app imports"        "On-Call Support Agent" $PY -c 'from app.main import app; print(app.title, app.version)'
check "12 alerts validate" "12 alerts validated"   $PY -c '
import json, pathlib
from app.models import Alert
print(sum(bool(Alert(**json.loads(p.read_text()))) for p in pathlib.Path("data/alerts").glob("*.json")), "alerts validated")'

head "environment"
check "GROQ_API_KEY present" "key loaded: True" $PY -c '
import os
from dotenv import load_dotenv; load_dotenv()
print("key loaded:", bool(os.environ.get("GROQ_API_KEY")))'
check ".env is gitignored" "ignored" bash -c 'git -C .. check-ignore -q .env && echo ignored'

head "server and CORS"
$PY -m uvicorn app.main:app --port "$PORT" >/tmp/verify_day1_uvicorn.log 2>&1 &
server=$!
trap 'kill $server 2>/dev/null' EXIT
if curl -s --retry 20 --retry-delay 1 --retry-connrefused -o /dev/null "localhost:$PORT/health"; then
  check "/health responds"      '"status":"ok"'   curl -s "localhost:$PORT/health"
  check "allowed origin echoed" "localhost:3000"  bash -c "curl -s -D - -o /dev/null -H 'Origin: http://localhost:3000' localhost:$PORT/health | grep -i access-control-allow-origin"
  # absence is the pass condition here, so it is inverted
  if curl -s -D - -o /dev/null -H "Origin: http://evil.example" "localhost:$PORT/health" \
       | grep -qi access-control-allow-origin
  then fail "unknown origin rejected (header was sent!)"; else pass "unknown origin rejected"; fi
  check "only /health exposed"  "['/health']" bash -c "curl -s localhost:$PORT/openapi.json | $PY -c \"import json,sys; print(list(json.load(sys.stdin)['paths']))\""
else
  fail "server never came up — see /tmp/verify_day1_uvicorn.log"
fi

head "eval sanity"
$PY baseline.py | sed 's/^/  /'

if (( fails )); then printf '\n\033[31m%d check(s) failed\033[0m\n' "$fails"; exit 1; fi
printf '\n\033[32mall mechanical checks passed\033[0m\n'
printf 'Still needs your judgment — see DAY1_PLAN.md:\n'
printf '  python3.13 show_scenario.py alrt_003     # no traceback; solvable by inference?\n'
printf '  python3.13 show_scenario.py alrt_009     # same — add --answer only after you commit\n'
