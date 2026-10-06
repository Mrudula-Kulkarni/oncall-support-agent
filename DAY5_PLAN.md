# Day 5 — MCP server, and deployment

**Status: MCP complete; deployment prepared but not executed (2026-10-05).** Source of truth:
`OnCall_Support_Agent_Build_Spec.md` (§6 MCP, §9.7, §9.8).

| Spec item | State |
|---|---|
| §9.7 — Custom MCP server | done |
| §9.8 — Deploy to Vercel + Render | config written, needs your accounts |
| §9.8 — Run the labelled test set, record the metric | done across three evals |
| §9.9 — Read the code back and explain it aloud | yours to do |

---

## The MCP server

Three tools over the synthetic data, exactly as §6 specifies:

```
fetch_logs(service_id)          the log entries for one service
get_recent_deploys(service_id)  its deploy history
get_runbook(category)           the runbook for an alert category, if one exists
```

It runs standalone over stdio, so any MCP client can inspect and call it:

```bash
cd backend && ./.venv/bin/python -m mcp_server.server
```

That is the point of building it as a server rather than a wrapper — the tools are callable from
outside this project, which is what makes it a real artifact.

### Why these three and not code search

Spec §10 draws the line and it is worth being able to defend: logs, deploys and runbooks are
operational lookups that **several agents share**, so a reusable tool interface fits. Locating a
file is a plain repo search that gains nothing from a protocol layer, so `repo_search.py` stays a
direct search. The boundary is about whether a capability is shared and reusable, not about
whether something is technically callable.

`verify_day5.sh` enforces this by parsing `repo_search.py`'s imports — a grep for "mcp" would
match the docstring that explains the decision.

### Why the pipeline does not spawn MCP per request

MCP's stdio transport means a subprocess and a handshake per session. Putting that on a request
path that already takes tens of seconds, to read local JSON, buys latency and a failure mode for
nothing.

So `app/tools.py` is the single interface the agents call, in-process by default and over MCP
when `USE_MCP_TOOLS=1`. Spec §6 anticipates exactly this — "agents can call the same functions
directly and the MCP layer can be added after".

**This is the honest version and it is a better interview answer than pretending otherwise.** The
tool boundary is real, the server is real and runnable, and the pipeline demonstrably works
through it end to end. What it is not is a protocol layer wedged into a hot path to look
impressive.

Verified both ways:

| Check | Result |
|---|---|
| Server exposes exactly the three §6 tools | pass |
| MCP and in-process return byte-identical logs, deploys, runbook | pass |
| Missing data degrades identically (`[]`, `[]`, `None`) | pass |
| Agents call `tools`, never `data_access` directly | pass |
| `repo_search` imports neither `mcp` nor `tools` | pass |
| In-process is the default; MCP is opt-in | pass |

And a full run through the MCP transport:

```
USE_MCP_TOOLS=1 → stock_sync.py / sync_stock_batch, confidence 0.92,
                  cited inc_006_off_by_one_batch_loop, 5.9s
```

---

## The dependency break this phase caused

`pip install mcp` pulled **starlette 1.7.0**, which fastapi 0.115.6 pins against. The backend
stopped importing entirely:

```
TypeError: Router.__init__() got an unexpected keyword argument 'on_startup'
```

Resolved by raising fastapi to 0.142.2 and uvicorn to 0.54.0 — which also moved pydantic to
2.13.5. Re-verified afterwards that the models still hold: all 12 alerts validate and the
`confidence` 0.0–1.0 bound still raises. `requirements.txt` records why the phase-1 pins moved,
because "why is fastapi pinned here" is otherwise an unanswerable question in six months.

One stale check surfaced: `verify_day1.sh` still asserted a three-route surface from Day 2, and
`/run/stream` arrived in Day 4. Updated.

---

## The measured results, in one place

Spec §8 asks for defensible numbers. These are all of them, each against a floor where one
exists.

| Metric | Agent | No-LLM floor | Delta |
|---|---|---|---|
| Localization — file | 12/12 | 10/12 | **+2** |
| Localization — file + function | 12/12 | 10/12 | **+2** |
| Triage category | 12/12 | — | — |
| Retrieval recall@3 | 12/12 | 11/12 | +1 |
| Retrieval recall@1 | 7/12 | 8/12 | **−1** |
| Fix grounded in a retrieved incident | 12/12 | — | — |
| Cited the expected mirror | 12/12 | — | — |
| Citation precision | 12/12 | 12/36 if citing all | — |

**What to actually say about these.** The honest framing matters more than the numbers:

- **Localization is the real result.** +2 over a trace-matching floor, and the two gained are
  precisely the scenarios with no traceback naming the answer — an unbounded cache found by
  reading a declared-but-unenforced TTL, and an off-by-one found from `received=500 written=499`.
  The advantage sits where reasoning is required rather than spread around.
- **Retrieval is a tie, and saying so is the stronger answer.** Chroma is worse at rank 1 and
  better at rank 3. The corpus is 18 documents written in the alerts' own vocabulary, so there is
  no vocabulary gap for embeddings to bridge. The vector store is the right structure as a corpus
  grows; on this one it ties a forty-line keyword matcher.
- **Citation precision is the one nobody can match trivially.** Retrieval hands the agent three
  candidates and it cited exactly the right one every time, never padding — "cite everything"
  scores 12/36.
- **Every prompt was iterated against these same 12 scenarios with nothing held out.** So each
  12/12 is a fit to the set, not a generalisation estimate. Say "located the correct file in 12 of
  12 labelled scenarios, +2 over a no-LLM baseline", never "100% accurate".

Countable facts that need no baseline: 4 agents, 12 scenarios, 8 planted bugs across 5 services,
18 past incidents, 5 runbooks, 3 MCP tools.

---

## Deployment: prepared, not executed

`render.yaml` and `DEPLOY.md` are written. The deploy itself needs your Render and Vercel
accounts, so it is the one part of this project not reproducible from the repo.

Three things in `DEPLOY.md` worth knowing before you demo it:

- **CORS is chicken-and-egg.** The backend needs the Vercel URL, which does not exist until the
  frontend is deployed. Deploy backend, deploy frontend, then set `CORS_ALLOWED_ORIGINS`. Until
  you do, the dashboard loads and every request fails in a way that looks like a bug.
- **Cold starts.** A Render free instance sleeps; the first request after idle takes ~30s before
  any agent runs. Open the link yourself before sending it.
- **Rate limits.** 8000 tokens/minute on Groq free, ~3400 for one Investigator call. Roughly two
  runs a minute. Do not click three scenarios in a row with someone watching.

---

## What is left

**Nothing in code.** Every spec item from §9.1 to §9.8 is built and verified.

**§9.9 is yours** and the spec calls it required rather than optional: read the code back and
explain the architecture aloud — why four agents, why the confidence branch, why MCP for
logs/deploys/runbooks but not for code lookup, why RAG. The four plan documents carry the
reasoning for each; the point of the exercise is being able to give it without them.

The open engineering problem, if you want one: the Investigator receives the whole log, the whole
deploy history and the full source of every candidate, which is what makes it slow (~21s average)
and what pushes a run against the token-per-minute ceiling. Trimming that prompt would address
both — and it has to be measured against `eval_investigator.py`, because a change that speeds it
up and loses `alrt_003` is not an improvement.
