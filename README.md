# On-Call Support Agent

When a production service breaks, the engineer who gets paged spends the first ten to thirty
minutes just gathering context: finding the right logs, working out which release caused it,
and searching code they may not have written. This project hands that part to four AI agents.

Given an alert, they return **what broke, where in the code it originates, and a suggested fix
grounded in a similar past incident**, in about ten seconds. The system only ever suggests. It
never runs anything against any system.

## How it works

```
Alert
  ↓
[1] Triage         severity + failure category                  (one LLM call)
  ↓
[2] Investigator   reads logs and recent deploys, searches      (tools + repo search)
  ↓                the code, names a file, function, confidence
  ├── confidence below 0.50 → stop and escalate to a human
  └── otherwise ↓
[3] Remediation    retrieves similar past incidents,            (RAG + LLM)
  ↓                proposes a fix that cites one
[4] Reporter       the summary the team would read in Slack     (one LLM call)
```

The website streams each agent's result as it finishes, so you watch the diagnosis build up
rather than waiting for the end.

## Results

All data is synthetic and authored, including eight bugs planted on purpose in a sample
codebase. That means every alert has a known right answer, so the agents can be scored rather
than eyeballed. Every agent result is reported next to a **no-LLM baseline**, because a number
with nothing to compare against says little.

| Metric | Agent | No-LLM baseline | Difference |
|---|---|---|---|
| Found the right file | 12/12 | 10/12 | **+2** |
| Found the right file and function | 12/12 | 10/12 | **+2** |
| Triage category | 12/12 | n/a | |
| Retrieval, right incident in top 3 | 12/12 | 11/12 | +1 |
| Retrieval, right incident ranked first | 7/12 | 8/12 | −1 |
| Fix cites a retrieved incident | 12/12 | n/a | |
| Citation precision | 12/12 | 12/36 if it cited everything | |

**The +2 is the result that matters.** Ten of the twelve alerts include a stack trace naming the
failing file, so a plain "take the nearest traceback" heuristic (`backend/baseline.py`) already
gets 10/12 with no AI at all. The two it misses are the ones with no trace: a cache that grows
forever, found by reading a TTL that is declared but never enforced, and an off-by-one found from
`received=500 written=499`. The agent gets both.

**Retrieval is honestly a tie.** On an 18-document corpus written in the alerts' own vocabulary,
embeddings beat a forty-line keyword matcher at top 3 and lose at top 1 (`backend/baseline_retrieval.py`).
The vector store is the right structure as a corpus grows; here it does not earn a win.

**Caveat.** Every prompt was tuned against these same 12 scenarios with nothing held out, so
each 12/12 is a fit to this set, not a generalisation estimate. The defensible claim is "located
the correct file in 12 of 12 labelled scenarios, +2 over a no-LLM baseline", not "100% accurate".

## Design decisions

- **Four narrow agents, not one big prompt.** Each can be evaluated and fixed on its own, and the
  split mirrors how incident response is actually divided.
- **A confidence branch.** Below 0.50 the run stops and goes to a human, rather than producing a
  confident-sounding fix from weak evidence. Escalation is a normal outcome, not an error.
- **Grounding is enforced in code, not just asked for.** A fix may only cite incidents retrieval
  actually returned, and the Investigator's file and function are checked against the real
  source, so neither can be invented.
- **Triage never sees the answer.** Each alert's `type` field equals the expected category, so it
  is withheld from the prompt; otherwise the eval would be scoring a copy.
- **An MCP server for shared lookups.** Logs, deploys and runbooks sit behind a custom MCP server
  (`fetch_logs`, `get_recent_deploys`, `get_runbook`) that any MCP client can call. Code search
  stays a direct function, since a protocol layer adds nothing there.
- **LangGraph for streaming.** The branch alone would not justify a framework; per-agent
  streaming to the website is what it buys.
- **Preset scenarios, no free-text input.** Keeps a public demo reliable and its cost bounded.

## Tech stack

| Layer | Tools |
|---|---|
| Agents | LangGraph, langchain-groq (`openai/gpt-oss-120b` on Groq's free API) |
| Retrieval | ChromaDB with local all-MiniLM-L6-v2 embeddings, so no embedding API |
| Backend | FastAPI, Pydantic, server-sent events |
| Tools | Custom MCP server (`mcp` 2.x, stdio) |
| Frontend | Next.js 16, React 19, Tailwind CSS 4, built as a static site |
| Hosting | Render: Python web service + static site |

## Repo layout

| Path | What it is |
|---|---|
| `backend/app/graph.py` | The four agents as a LangGraph, with the confidence branch and streaming |
| `backend/app/agents/` | One module per agent |
| `backend/app/models.py` | Typed input and output contract for every agent |
| `backend/app/main.py` | FastAPI: `/health`, `/scenarios`, `/run`, `/run/stream` |
| `backend/app/rag.py` | Chroma index over the past incidents |
| `backend/app/repo_search.py` | Deterministic ranking of candidate files, no LLM |
| `backend/app/tools.py` | Tool interface: in-process, or over MCP with `USE_MCP_TOOLS=1` |
| `backend/mcp_server/` | The MCP server |
| `backend/data/` | 12 alerts, logs, deploy history, 18 past incidents, 5 runbooks, eval labels |
| `sample_repo/` | The codebase being investigated: 5 services, 8 planted bugs, plus clean decoys |
| `frontend/` | The website: overview, incident list, live agent trail, final report |

`sample_repo/` is deliberately not the application. It is what the agents investigate.

## Running locally

**Backend** (Python 3.13):

```bash
cd backend
python3.13 -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
cp ../.env.example ../.env        # then set GROQ_API_KEY
./.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

**Frontend** (in a second terminal):

```bash
cd frontend
npm install
npm run dev                       # http://localhost:3000
```

**Checks and evals:**

```bash
cd backend
./verify_day1.sh                       # data and wiring checks, exits non-zero on failure
./.venv/bin/python eval_triage.py      # triage category accuracy
./.venv/bin/python baseline.py         # the no-LLM localization baseline
./.venv/bin/python -m mcp_server.server   # run the MCP server on its own, over stdio
```

## Deploying

Both halves deploy to Render from `render.yaml`: the backend as a Python web service and the
frontend as a free static site. Step-by-step instructions are in [`DEPLOY.md`](DEPLOY.md).

On the free plan the backend sleeps when idle, so the first request after a quiet spell takes
30 to 60 seconds. Groq's free tier allows roughly two full runs per minute.
