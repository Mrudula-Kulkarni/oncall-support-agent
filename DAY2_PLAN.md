# Day 2 — Triage + Reporter, and the first end-to-end pipeline

**Status: complete (2026-09-29).** Source of truth: `OnCall_Support_Agent_Build_Spec.md`
(§4.1 Triage, §4.4 Reporter, §9.2 build order).

The pipeline runs end to end: `POST /run {"alert_id": "alrt_003"}` returns a populated
`PipelineResult` in ~1.4s. Triage scores 12/12 on category — **read the caveat on that number
below before quoting it.**

---

## Why this phase, and why these two agents first

Spec §9.2 puts the two simplest agents before the hard one so that *there is always something
demoable*. After this phase an alert goes in and a plain-English incident summary comes out —
not a useful diagnosis yet, but a complete path through the system. Every later phase then
slots into a pipeline that already runs rather than one that has to be stood up first.

This is also the first phase that spends the Groq key. Day 1 made no LLM calls at all.

Triage and Reporter are the right pair because they bracket the pipeline: Triage is the
entry point and takes only the alert, Reporter is the exit and takes whatever the earlier
agents produced. Building both now fixes the shape of the pipeline's two ends, so the
Investigator and Remediation agents get added in the middle without reworking either.

---

## What gets built

| File | Role |
|---|---|
| `backend/app/llm.py` | One place that builds the Groq client, so model and temperature are not scattered across agents |
| `backend/app/data_access.py` | Reads the Day 1 fixtures: `list_alerts()`, `load_alert()`, `load_logs()`, `load_deploys()`, `load_runbook()` |
| `backend/app/agents/triage.py` | §4.1 — alert → `TriageOutput{severity, category, short_reason}` |
| `backend/app/agents/reporter.py` | §4.4 — all prior output → `ReporterOutput{summary_markdown}` |
| `backend/app/pipeline.py` | `run_pipeline(alert_id)` → `PipelineResult`, timed |
| `backend/app/main.py` | `POST /run`, `GET /scenarios` |
| `backend/eval_triage.py` | Scores Triage against the 12 labels |

`data_access.py` deliberately covers logs, deploys and runbooks even though only Triage and
Reporter exist yet. Those three are exactly the reads that spec §6 moves behind MCP on Day 5,
so putting them behind one module now means that phase relocates a single file instead of
hunting down scattered `open()` calls.

`TriageOutput` and `ReporterOutput` were already fixed in `app/models.py` on Day 1, so there
is no contract to design here — only prompts to write against a shape that already exists.

---

## The one real problem this phase has to solve

**The alert fixtures already contain the answer Triage is supposed to produce.**

Every alert carries a `type` field, and `verify_data.py` asserts `alert["type"] ==
expected_category` for all 12 scenarios. So if the whole alert is handed to the prompt,
Triage is not classifying anything — it is copying a field across, and a 12/12 category score
would measure nothing at all.

Two consequences, and they differ:

- **Category** is fixable. The prompt is built from an explicit allowlist of fields —
  `service_id`, `message`, `metric`, `source`, `timestamp` — and `type` is withheld. The score
  then reflects real classification from the symptom text, and `alert.type` stays in the
  fixtures as the ground truth `eval_triage.py` grades against.
- **Severity** is not fixable here. Day 1 deliberately left severity out of the alerts because
  deciding it is Triage's job, which is right, but it also means there is no label to grade
  against. Severity is therefore judgment-only this phase. Adding `expected_severity` to
  `labeled_test_set.json` is worth doing while the intent behind each alert is still fresh,
  but it is a data change, not an agent change, so it is not bundled into this phase.

---

## Results, and why the headline number needs a caveat

Triage category accuracy went **10/12 → 11/12 → 12/12** across three prompt revisions.
Latency averaged 1989ms, ranging 459ms to 8045ms.

**That 12/12 is a training-set score, not a generalisation estimate.** The prompt was iterated
against the same 12 scenarios it is graded on, with no held-out set, so it says the prompt fits
these alerts — not that it would classify a thirteenth correctly. Quoting it as "100% triage
accuracy" would be the kind of unearned number `README.md` already commits to avoiding.

What the iteration actually fixed is worth recording, because two of the three changes were
real domain rules rather than fitting to the answer key:

1. **`alrt_010` (failed_deploy → error_rate_spike).** The alert has `minutes_since_deploy: 6`
   and a 0.98 error rate. Both categories describe it; only one names the mechanism. Fixed by
   ordering the categories by precedence, with deploy-onset winning over the symptom.
2. **`alrt_011` (latency_spike → error_rate_spike).** p99 at 2140ms against a 95ms baseline,
   surfacing as statement timeouts. Fixed by a rule that timeouts are slowness.
3. **That rule then broke `alrt_004`**, which mentions `requests.Timeout` but is genuinely an
   error-rate incident — it carries `error_rate`/`baseline_error_rate` and no latency metric at
   all. Fixed by hinging the decision on *which reading is elevated against its own baseline*
   rather than on the word "timeout". This is the one that generalises: the fixtures encode
   the category in the metric pairing, and the rule now reads that rather than the prose.

The honest ways to report this: describe the metric-pairing rule as a design decision, cite the
count of scenarios, and say the prompt was tuned against them. If a real accuracy number is
wanted later, hold out 3–4 scenarios before touching the prompt again.

**Latency is not yet demo-stable.** Even with `reasoning_effort="low"`, triage ranged
459–8045ms, and an unbounded earlier run hit 32s on a single call. `gpt-oss-120b` spends a
variable number of hidden reasoning tokens per request. If the §8 latency metric matters, a
non-reasoning model or a smaller one is the lever.

---

## Fixture defects found by hand-testing the evidence chain

Working `alrt_003` by hand — the check DAY1_PLAN.md asks for and nothing automated can do —
turned up three real problems. None was visible to any existing check.

**1. Three of five log fixtures were authored out of chronological order.** `show_scenario.py`
and `data_access.load_logs()` both read them in file order, so for `alrt_003` (which fires at
11:40:00) the first thing a reader saw was a block of entries from 14:21–14:22 — a *different*
incident, two and a half hours later, whose tracebacks name `checkout_api.py` and
`payment_processor.py`. The actual cache evidence sat at the bottom. A hand-test picked exactly
those two wrong files, which is the correct read of what was presented.

Fixed by sorting on disk, sorting again in `load_logs()` and `show_scenario.py` so a
hand-edited fixture cannot regress it, and adding an ordering assertion to `verify_data.py`
(verified it fires by reversing a fixture).

**2. Two alerts fired before the logs they were about.** `alrt_002` was timestamped 26 hours
before the earliest checkout entry; `alrt_005` fired 3.7 hours after its evidence with nothing
contemporaneous. Timing was therefore unusable as a correlation signal for those two, which
matters because correlating by timing is half of what spec §4.2 asks the Investigator to do.
Realigned to 2026-09-28T14:26:00Z and 2026-09-28T13:09:00Z, both still after their introducing
deploys. `verify_data.py` now asserts no alert precedes every log entry for its service.

`alrt_007` and `alrt_012` looked incoherent by the same measure but are not: their own evidence
sits at their alert time, and the far-off match belongs to the *other* alert for the same bug.
That is by design — four bugs get two alerts each.

**3. `baseline.py` was measuring the wrong thing.** It guessed the most frequently traced file,
which counts traces belonging to other incidents in the same log, and ties when a service has
one traceback per file. Payment-service ties exactly that way, so the "75%" figure quoted
earlier was resolving a 1–1 tie by file order — sorting the fixtures silently moved it to 67%.

Rewritten to take the traceback nearest in time to the alert, which is both what an engineer
does and deterministic. **The floor is 10/12 = 83%**, and the only two misses are `alrt_003`
and `alrt_009` — precisely the two scenarios with no traceback naming the answer. That is a
higher bar for the Investigator than the number it replaces, and an honest one.

---

## Departures from the spec

1. **Model: `openai/gpt-oss-120b`, not Llama 3.3 70B.** Spec §3 names Groq's Llama 3.3 70B.
   That model no longer exists on Groq — the API returns `model_not_found`, and the current
   catalogue has no Llama chat model at all. Of what is available, `openai/gpt-oss-120b` is
   the pick: 131k context, which the Investigator will need once it is feeding logs, deploy
   history and source files into one prompt. `gpt-oss-20b` and `qwen3.8-27b` were also
   verified working with structured output and are drop-in alternatives via `GROQ_MODEL`.
   Nothing in the architecture depends on the vendor of the model, so this is a config change,
   not a design change.
2. **Structured output via `with_structured_output`, not hand-parsed JSON.** Pydantic models
   already define every agent's contract, so the model is constrained to them directly rather
   than prompted to emit JSON and parsed defensively. A malformed response becomes a
   validation error at the boundary instead of a plausible-looking wrong object.
3. **`reasoning_effort="low"` on every call.** Not in the spec, because the spec assumed a
   non-reasoning Llama model. gpt-oss emits hidden reasoning tokens before answering, measured
   at 9 tokens on "low" against 198 on "high", and left unbounded one triage call took 32s.
   It is a per-call argument in `llm.py`, so the Investigator can raise it if localisation
   turns out to need the deliberation.

---

## How to verify

```bash
cd backend

# 1. Day 1 checks still pass — nothing regressed
./verify_day1.sh

# 2. end to end, one scenario
./.venv/bin/python -m uvicorn app.main:app --reload
curl -s localhost:8000/scenarios | python3 -m json.tool | head
curl -s -X POST localhost:8000/run -H 'Content-Type: application/json' \
     -d '{"alert_id":"alrt_001"}' | python3 -m json.tool

# 3. Triage category accuracy over all 12 labelled scenarios
python3.13 eval_triage.py
```

Expected: `/run` returns a `PipelineResult` with `triage` and `report` populated,
`investigation` and `remediation` still null, and a non-null `duration_ms`.

### By judgment

Automated checks prove the pipeline runs and that categories match labels. They cannot tell
you whether the output is any good. Read a generated summary and ask:

- **Would this be useful pasted into an incident channel?** The Reporter's only job is to be
  read by a human under time pressure. If it hedges, repeats the alert back, or buries the
  point, the prompt needs work regardless of what the category score says.
- **Is the severity defensible?** There is no label for it. Read Triage's `short_reason` and
  decide whether you would have called it the same.
- **Does it degrade honestly?** The Reporter has to handle a run with no investigation or
  remediation, which is every run this phase. It should say what is not yet known rather than
  implying a diagnosis it does not have.

---

## What does NOT exist after this phase

- **No investigation.** Nothing locates a file. `investigation` is null on every run, so the
  §8 localization metric is not measurable yet — `baseline.py` still reports only the 75%
  no-LLM floor it measured on Day 1.
- **No remediation, no RAG, no vector store.**
- **No LangGraph.** The pipeline is a straight function call. The confidence branch in §9.5
  arrives with the agent that produces a confidence score.
- **No MCP.** Fixture reads go through `data_access.py` directly, per §6's instruction to
  build that layer last.
- **No UI.** `frontend/` is still a placeholder.

---

## Next: Day 2–3 — Investigator

Spec §9.3, and the hardest phase. Two things from earlier work feed straight into it:

- `baseline.py` says a no-LLM heuristic — nearest traceback to the alert — scores 10/12 on
  file localization. The Investigator has to beat 83% to be worth having, so report its
  accuracy as a delta against that floor, not on its own.
- `alrt_003` and `alrt_009` are the only two scenarios the baseline misses, because their logs
  carry no traceback naming the answer. They are the whole difference between this eval and a
  regex. **Both are now hand-verified solvable**, which is the precondition spec §9.3 needs
  before prompt iteration begins — a miss is now attributable to the agent rather than
  ambiguous between a weak agent and a broken fixture.
  - `alrt_003`: solvable once log ordering was fixed — cache size climbing, heap at 94%, and
    an entry still held from seven days earlier, all inside two minutes of the alert. Note it
    cannot be re-tested blind by whoever debugged it; the chain was walked rather than guessed.
  - `alrt_009`: solved first try from `received=500 written=499` plus the oversell warnings,
    choosing `stock_sync.py` over `reservation_api.py` with no traceback naming either.
