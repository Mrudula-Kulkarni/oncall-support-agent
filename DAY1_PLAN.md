# Day 1 — Scaffold + Synthetic Data

**Status: complete (2026-09-28).** Source of truth for the overall build:
`OnCall_Support_Agent_Build_Spec.md` (§5 data, §9.1 build order).

---

## Why this phase came first

Every later phase depends on controlled data. The Investigator's file-localization accuracy,
the Remediation agent's RAG grounding, and the §8 eval metric all rest on a hand-authored
alert→bug mapping. Because we author that mapping, the accuracy number reported later
("located the correct file in N/12 scenarios") is honest and defensible in an interview.

No LLM calls happen in this phase — nothing here needed the Groq key.

---

## What was built

### Backend scaffold
- `backend/app/main.py` — FastAPI app. One route (`GET /health`) plus CORS middleware reading
  allowed origins from the environment.
- `backend/app/models.py` — Pydantic contracts for every agent I/O shape in spec §4:
  `Alert`, `TriageOutput`, `InvestigatorOutput`, `RemediationOutput`, `ReporterOutput`,
  and `PipelineResult`. `confidence` is bounded to 0.0–1.0 at the model level.
- `backend/requirements.txt`, `.python-version`, `.env` / `.env.example`, `.gitignore`.

### Sample repo — the "production" codebase under investigation
5 services, 12 Python files: 8 with planted bugs, 2 clean decoys
(`checkout_api.py`, `email_client.py`), 2 shared modules (`common/db_client.py`,
`common/http_client.py`). The decoys matter — without them, locating the right file would be
a single-candidate guess rather than a real task.

| # | Service | File | Function | Failure mode | Category |
|---|---|---|---|---|---|
| 1 | checkout-service | `payment_processor.py` | `build_billing_payload` | missing null check on `billing_address` | error_rate_spike |
| 2 | checkout-service | `cart_cache.py` | `get_cart` | TTL declared but never enforced; cache grows unbounded | latency_spike |
| 3 | payment-service | `gateway_client.py` | `charge_card` | `@with_retries` absent (still present on siblings) | error_rate_spike |
| 4 | payment-service | `refund_handler.py` | `process_refund` | exception escapes the worker loop → crash loop | service_down |
| 5 | auth-service | `token_manager.py` | `validate_token` | check-then-delete race on unsynchronized cache | error_rate_spike |
| 6 | inventory-service | `stock_sync.py` | `sync_stock_batch` | `range(len(items) - 1)` skips last item per batch | error_rate_spike |
| 7 | inventory-service | `reservation_api.py` | `reserve_items` | reads `reservation_id`; v3 API returns `id` | failed_deploy |
| 8 | notification-service | `status_store.py` | `record_notification_status` | `statement_timeout_ms=50`, below normal p99 | latency_spike |

### Fixtures
- **12 alert scenarios** (`data/alerts/`) covering the 8 bugs. Four bugs get a second alert at
  different volume so Triage has severity variance to classify. Alerts carry no severity
  field — deciding severity is the Triage agent's job.
- **5 log fixtures** (`data/logs/`), one per service, carrying the stack traces that point at
  the bug plus unrelated noise.
- **5 deploy histories** (`data/deploys/`). The bug-introducing deploy is present but *not*
  flagged — the Investigator must correlate it by timing and changed files.
- **18 past incidents** (`data/incidents/`). Eight mirror the planted bugs so RAG retrieval is
  groundable; ten are near-misses so retrieval is not trivially one-to-one.
- **5 runbooks** (`data/runbooks/`), keyed by category for `get_runbook(category)`.
- **`data/eval/labeled_test_set.json`** — ground truth. Each scenario names the expected file,
  function, bug type and introducing deploy. `acceptable_functions` exists because some bugs
  can fairly be reported at either the raising line or its caller.

### Verification tooling
- `backend/verify_data.py` — asserts the data is internally consistent.
- `backend/show_scenario.py` — prints what an agent would see for one alert, answer hidden
  until `--answer`.

---

## Departures from the original plan

1. **Python 3.13, not the system 3.14.** `python3` on this machine is 3.14.3, which has no
   `pydantic-core` wheel — pip fell back to compiling Rust and failed. Pinned via
   `.python-version`. This also matters for Render at deploy time.
2. **`requirements.txt` pins only what is installed today.** `langchain-groq`, `chromadb` and
   `langgraph` are listed as commented entries to be pinned in their own phases, against a
   working install rather than a guessed version.

---

## How to verify

All commands from `backend/`, using the venv interpreter explicitly (a conda `base` env on
this machine otherwise shadows it).

### Automated

```bash
# 1. data is internally consistent — every label resolves to a real file, function,
#    deploy and runbook. Re-run after editing any fixture.
python3.13 verify_data.py

# 2. right interpreter and dependencies
./.venv/bin/python --version                     # expect 3.13.7
./.venv/bin/python -m pip list | grep -Ei "fastapi|pydantic|uvicorn|dotenv"

# 3. app imports without error
./.venv/bin/python -c "from app.main import app; print(app.title, app.version)"

# 4. fixtures satisfy the models (proves data and code agree)
./.venv/bin/python -c "
import json,pathlib
from app.models import Alert
print(sum(bool(Alert(**json.loads(p.read_text()))) for p in pathlib.Path('data/alerts').glob('*.json')), 'alerts validated')"

# 5. environment loads, without printing the key
./.venv/bin/python -c "
import os; from dotenv import load_dotenv; load_dotenv()
print('key loaded:', bool(os.environ.get('GROQ_API_KEY')))"

# 6. server + CORS
./.venv/bin/python -m uvicorn app.main:app --reload
#   in another terminal:
curl localhost:8000/health
curl -s -D - -o /dev/null -H "Origin: http://localhost:3000" localhost:8000/health | grep -i access-control-allow-origin   # echoes the origin
curl -s -D - -o /dev/null -H "Origin: http://evil.example"  localhost:8000/health | grep -i access-control-allow-origin   # prints nothing

# 7. no secrets are committable (from the project root)
git check-ignore -q .env && echo "OK: .env ignored"
```

Expected from `verify_data.py`: 12 alerts, 12 labeled, 8 distinct bugs, 5 log / 5 deploy
fixtures, 18 incidents, 5 runbooks, and `OK — every label resolves...`.

### By judgment — the part that actually matters

Automated checks prove the data is *consistent*. They cannot prove it is *good*. Three
questions only a human can answer:

**Is the difficulty spread real?** Commit to an answer before revealing it:

```bash
python3.13 show_scenario.py alrt_010            # should be easy
python3.13 show_scenario.py alrt_010 --answer
python3.13 show_scenario.py alrt_007            # should be hard
python3.13 show_scenario.py alrt_007 --answer
```

- Both instantly → the set is too easy; accuracy approaches 100% and the metric is worthless.
- `alrt_010` fast, `alrt_007` only after real thought → the spread is right.
- `alrt_007` unsolvable even with effort → the evidence chain may be broken, not just hard.

**Do the bugs look real?** Read the function each answer names. Would a competent engineer
have written this and not noticed? A bug that reads as staged undermines the demo.

**Is the chain complete?** If the right file was reachable from the evidence alone — rather
than by guessing — the Investigator has enough to work with.

---

## What does NOT exist yet

- **No UI.** `frontend/` is a placeholder README.
- **No agents, no pipeline, no `/run` endpoint.** `/health` is the only route; `/docs` lists
  exactly one endpoint.
- **Groq key is configured but never exercised.** First real call happens with the Triage agent.

Nothing is demoable yet, by design. Spec §9.2 puts a trivial pipeline next precisely so that
there is always something demoable from that point on.

---

## Next: Day 1–2 — Triage + Reporter

Build the two simplest agents against Groq plus a `/run` endpoint, giving an end-to-end
`alert → triage → reporter` path. This is the first phase that exercises the API key and the
first point where the project can be shown to someone. Build the hard Investigator agent only
after that path works.
