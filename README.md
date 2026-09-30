# On-Call Support Agent

A multi-agent incident-response system. Given a production alert, a pipeline of four agents
returns, in plain English: **what broke, where in the code it likely originates, and a
suggested fix grounded in similar past incidents.**

The system only ever *suggests* — it never executes a remediation.

## How it works

```
Alert
  ↓
[1] Triage         classify severity + category                (single LLM call, no tools)
  ↓
[2] Investigator   fetch logs + deploys, search the repo,      (tools + direct file search)
  ↓                produce a hypothesis + confidence score
  ├── confidence below threshold → escalate to a human, skip remediation
  └── confidence acceptable ↓
[3] Remediation    RAG over past incidents → grounded fix      (retrieval + LLM)
  ↓
[4] Reporter       plain-English incident summary              (single LLM call)
```

Everything the agents see is controlled sample data: the alerts, logs, deploy history, the
past-incident corpus, and the "production" codebase being investigated. No real
infrastructure is involved, which is what makes the demo reliable and free to run.

## Layout

| Path | What it is |
|---|---|
| `backend/app/models.py` | Structured I/O contract for every agent |
| `backend/app/main.py` | FastAPI entrypoint (`/health`, `/scenarios`, `/run`, CORS) |
| `backend/app/agents/` | One module per agent (Triage, Reporter so far) |
| `backend/app/pipeline.py` | Runs the stages that exist and times the run |
| `backend/app/llm.py` | Groq client — model and sampling in one place |
| `backend/app/data_access.py` | All fixture reads (moves behind MCP on Day 5) |
| `backend/data/alerts/` | 12 alert scenarios |
| `backend/data/logs/` | Per-service log snippets, including the bug-revealing traces |
| `backend/data/deploys/` | Per-service deploy history |
| `backend/data/incidents/` | 18 past-incident write-ups (the RAG corpus) |
| `backend/data/runbooks/` | 5 runbooks, keyed by alert category |
| `backend/data/eval/` | Labeled ground truth for measuring localization accuracy |
| `sample_repo/` | The "production" codebase the agents investigate — contains 8 planted bugs |
| `frontend/` | Next.js dashboard (later phase) |

`sample_repo/` is deliberately *not* the application code. It is the target of
investigation: five services with eight planted bugs, plus clean decoy files so locating the
right one is a real task rather than a single-candidate guess.

## Running the backend

Requires Python 3.13 (3.14 has no wheels for parts of this stack yet — see `.python-version`).

```bash
cd backend
python3.13 -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
./.venv/bin/python -m uvicorn app.main:app --reload
curl localhost:8000/health
```

Copy `.env.example` to `.env` and set `GROQ_API_KEY` before the agent phases. All agents run
on Groq's free API, so a public demo costs nothing per click.

## Measuring it honestly

Because the alert→bug mapping is authored, `backend/data/eval/labeled_test_set.json` is a real
answer key: 12 scenarios across 8 distinct bugs and 5 services. That supports one defensible
metric — **root-cause localization accuracy**, reported as a fraction of those 12 scenarios —
plus countable facts (4 agents, 18 past incidents, 5 runbooks) and measured end-to-end latency.

It does not support comparative claims like "reduced MTTR by X%". There is no baseline here to
compare against, so no such number is reported.

## Design decisions worth knowing

- **Four narrow agents rather than one large prompt.** Single-purpose agents are easier to
  evaluate and fix in isolation, and the split mirrors how incident response is actually
  divided.
- **A confidence branch, not blind continuation.** Low confidence escalates to a human instead
  of generating a confident-sounding fix from weak evidence.
- **Tool access for logs/deploys/runbooks, direct search for code.** Shared operational
  lookups sit behind a reusable tool interface; locating a file is a plain repo search, where a
  protocol layer would add a dependency without adding capability.
- **Retrieval for remediation.** Suggested fixes are grounded in what resolved similar
  incidents before rather than invented.
- **Preset scenarios, no free-text input.** Keeps a public demo reliable and its cost bounded.

## Status

**Phase 1** — scaffold, models, and all synthetic data, ground truth cross-checked against the
source files it points to. See `DAY1_PLAN.md`.

**Phase 2** — Triage and Reporter agents, and a working `alert → triage → reporter` path behind
`POST /run`. See `DAY2_PLAN.md`. Triage matches the authored category on all 12 scenarios, but
its prompt was tuned against those same 12 with nothing held out, so that is a fit to the set
rather than a measure of generalisation — `DAY2_PLAN.md` records what each revision fixed.

Next: the Investigator (spec §9.3), which is where root-cause localisation — and the one metric
this project can honestly report — actually gets measured.

Running the two phases that exist:

```bash
cd backend
./verify_day1.sh                 # every mechanical check, exits non-zero on failure
./.venv/bin/python eval_triage.py   # triage category accuracy over the 12 scenarios
./.venv/bin/python baseline.py      # the no-LLM localisation floor the Investigator must beat
```
