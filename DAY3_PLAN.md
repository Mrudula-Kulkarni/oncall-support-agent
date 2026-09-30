# Day 3 — Investigator, and the first measurable metric

**Status: complete (2026-09-30).** Source of truth: `OnCall_Support_Agent_Build_Spec.md`
(§4.2 Investigator, §8 evaluation, §9.3 build order).

**12/12 file localization, +2 over an 83% no-LLM floor, and the +2 are exactly the two
scenarios no heuristic can reach.** Read "Results" before quoting any of it.

---

## Why this is the phase that matters

Spec §9.3 calls it the hardest part, and §8 explains why: root-cause localization accuracy is
the **only** metric this project can honestly report. Everything before now was scaffolding for
it. Triage classifies, the Reporter writes prose — neither produces a number anyone would ask
about in an interview. This does.

It is also the phase where the confidence branch becomes real. Until now `escalated_to_human`
was always false because nothing produced a confidence score.

---

## What gets built

| File | Role |
|---|---|
| `backend/app/repo_search.py` | Deterministic candidate gathering over `sample_repo/`. No LLM |
| `backend/app/agents/investigator.py` | §4.2 — evidence + candidate source → hypothesis, file, function, confidence |
| `backend/eval_investigator.py` | Localization accuracy, reported as a delta on the no-LLM floor |
| `backend/app/pipeline.py` | Confidence branch: below 0.5, escalate and skip remediation |

### Why the search is split from the agent

`repo_search` contains no model call. It gathers candidates from the evidence and ranks them;
the agent picks between them. That split exists for one reason: **a wrong answer has to be
attributable.** Either the correct file was never offered, which is a search bug, or it was
offered and the model chose another, which is a prompt problem. Without the split, every miss
is ambiguous.

Verified before writing a single prompt: across all 12 scenarios the correct file is always
among the candidates, worst rank 3 of 5. So the search never hides the answer, and every miss
from here is the agent's.

Also verified: taking rank 1 blindly scores 8/12. The ranking is a useful prior, not a
shortcut — the model has real work to do on four scenarios.

Spec §4.2 and §10 both say code lookup is a direct repo search rather than an MCP tool, on the
grounds that a protocol layer adds a dependency without adding capability. Logs, deploys and
runbooks do go through `data_access`, which is what moves behind MCP on Day 5.

---

## The floor this has to beat, and how it was established

Reporting "located the correct file in N/12" on its own would overstate what the agent
contributes, because most production alerts carry a stack trace naming the failing file. So the
floor was measured first, with three no-LLM heuristics:

| Heuristic | Score |
|---|---|
| Nearest traceback to the alert, deepest frame | **10/12 = 83%** |
| Module-shaped logger name nearest the alert | 9/12 = 75% |
| Combined nearest-mention of any kind | 9/12 = 75% |

The combined heuristic scores *worse* than tracebacks alone, which is a good sign about the
fixtures: `checkout_api.py` is an entry-point decoy that is always nearest in time for
checkout-service, so naive proximity gets pulled to the wrong file. The decoys work.

**83% is the bar.** The two scenarios no heuristic reaches are `alrt_003` (unbounded cache — no
traceback exists, because nothing raises) and `alrt_009` (off-by-one — the evidence is
`received=500 written=499`). Both were hand-verified solvable during Day 2. They are where the
agent either reasons or doesn't, so `eval_investigator.py` reports them separately from the
headline.

---

## Results

| Measure | Value |
|---|---|
| Localization — file | 12/12 = 100% |
| Localization — file + function | 11/12 = 92% |
| No-LLM floor (`baseline.py`) | 10/12 = 83% |
| Delta vs floor | **+2 scenarios** |
| `alrt_003` / `alrt_009` — the two the floor cannot reach | **2/2** |
| Investigator latency | avg ~21s, min 2.2s, max 33s |

The delta is the number that means something, and its shape matters more than its size: the two
scenarios gained are precisely the two with no traceback naming the answer. The agent's advantage
sits where reasoning is required rather than spread around by luck. On `alrt_003` it cited
`CACHE_TTL_SECONDS = 900  # defined but never used for eviction` — it read the source and found
the mechanism rather than matching a stack frame.

**The same caveat as Day 2 applies, and harder.** 12/12 with nothing held out is a fit to these
12 scenarios, not a generalisation estimate. The defensible claim is "+2 over an 83%
trace-matching floor, on the two scenarios that require reading code" — never "100% accuracy".

### Problems found and fixed while measuring

1. **The eval counted rate limits as wrong answers.** A run reported 9/12 when two of the three
   "misses" were `RateLimitError` from Groq's free tier. That is the worst class of eval bug: it
   silently blames the model for infrastructure. Now retries with backoff, paces the loop,
   reports upstream failures separately, and refuses to print a delta at all if any scenario
   failed. The low-vs-medium `reasoning_effort` comparison that prompted this was thrown out.
2. **The Reporter crashed** with `Tool choice is required, but model did not call a tool` — it
   answered in prose instead of calling the structured-output tool once summaries got longer.
   `ReporterOutput` is a single free-text field, so the tool call bought no validation and only
   added a failure mode. Now a plain call, wrapped.
3. **The Reporter contradicted itself**, naming `cart_cache.py` under *Where it originates* while
   Status still read "investigation has not run yet". Each section is now tied to whether its
   input is present, and Status must agree with the sections above it.
4. **`defined_functions` disagreed with `verify_data.py`.** It matched only `def`/`class`, so it
   rejected `_db` — the module-level binding that IS the answer for `alrt_011`, where
   `statement_timeout_ms=50` sits in no function at all. A correct answer was flagged bogus and
   its confidence capped, producing three false escalations. Now `defined_symbols`, which
   accepts module bindings like `verify_data.py` already did, plus `normalise_symbol` so a
   method reported as `CartCache.get_cart` is not treated as wrong.

### Latency is the open problem

~21s average for the Investigator, against ~1s for Triage and the Reporter. A full pipeline run
is 25-40s, which is too slow for the §7 dashboard's live reasoning trail.

`reasoning_effort="medium"` is kept because it is the setting that produced this result, and
trading a measured 12/12 for an unmeasured hunch is the wrong way round. The more promising lever
is prompt size: the agent currently receives the entire log, the entire deploy history, and the
complete source of every candidate. Trimming to the entries near the alert and the top-ranked
candidates should cut most of it without touching the reasoning. That is a follow-up, and it must
be measured the same way — a change that speeds it up and loses `alrt_003` is not an improvement.

---

## How to verify

```bash
cd backend
./verify_day1.sh                       # free, must still pass
./verify_day2.sh                       # updated: investigation is now populated
./.venv/bin/python baseline.py         # the 83% floor
./.venv/bin/python eval_investigator.py -v   # accuracy, delta, and the two hard scenarios
```

Expected from `eval_investigator.py`: a per-scenario table marking where the agent and the floor
disagree, a file and file+function accuracy, the delta, and how many runs escalated.

### By judgment

- **Is the confidence calibrated?** A score that is always 0.8 is decoration. High confidence on
  a correct answer and visibly lower on a hard or ambiguous one is the point. Check that nothing
  wrong came back above 0.85.
- **Does the evidence cite the source, or just the logs?** An answer that quotes a line of code
  found the mechanism. An answer citing only log lines may have pattern-matched a traceback and
  been right by luck.
- **Would the hypothesis help a real on-call?** It should name the mechanism, not restate the
  symptom.

---

## Next: Day 3–4 — Remediation + RAG

Spec §9.4: embed the 18 past incidents into Chroma, retrieve the nearest cases, and generate a
fix grounded in them with citations. The confidence branch built here decides whether that agent
runs at all.
