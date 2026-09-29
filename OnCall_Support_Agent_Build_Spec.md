# On-Call Support Agent — Build Spec

A build specification for an AI multi-agent incident-response system. This document is the source of truth for what to build, in what order, and why each piece exists. Hand it to Claude Code and work through it phase by phase.

---

## 1. Goal

Build a working, demoable **multi-agent incident-response system**. Given a production alert, it runs the alert through a pipeline of four agents and returns, in plain English: **what broke, where in the code it likely originates, and a suggested fix grounded in similar past incidents.**

The demo audience is a recruiter or engineer clicking a public link — so it must be reliable, self-contained (no real infrastructure needed), and cheap to run.

**Non-goals (explicitly out of scope):**
- No real remediation actions — the system only *suggests* fixes, never executes them.
- No real production infrastructure — all alerts, logs, deploys, and the target codebase are controlled sample data.
- No paid APIs — use Groq's free API only (no Claude/OpenAI paid calls).

---

## 2. Architecture Overview

Four agents run as a sequential pipeline, orchestrated by LangGraph, with one branch:

```
Alert
  ↓
[1] Triage Agent        → classify severity + category
  ↓
[2] Investigator Agent  → fetch logs + deploys (via MCP), locate responsible file/function,
  ↓                        output root-cause hypothesis + confidence score
  ├── if confidence LOW → escalate to human (stop, flag for review)
  └── if confidence OK  ↓
[3] Remediation Agent   → RAG over past incidents, generate suggested fix
  ↓
[4] Reporter Agent      → draft plain-English incident summary
  ↓
Final output (shown in dashboard)
```

---

## 3. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js | Deployed on Vercel |
| Backend | FastAPI (Python) | Deployed on Render |
| Orchestration | LangGraph | Coordinates the 4 agents + the confidence branch |
| Tooling protocol | Custom MCP server | Exposes log/deploy/runbook tools to agents |
| Retrieval | RAG over a vector store (Chroma) | Embeds past incidents/runbooks |
| LLM | Groq — Llama 3.3 70B | Free API, used by all agents |
| Frontend/backend link | REST API + CORS | Two different domains, so CORS must be configured |

---

## 4. Agents — Detailed Spec

Each agent takes structured input (JSON / Pydantic model) and returns structured output. Keep each agent's prompt narrow and single-purpose.

### 4.1 Triage Agent
- **Input:** an alert payload (see §5 for format).
- **Job:** classify `severity` (e.g. critical/high/medium/low) and `category` (e.g. latency_spike, service_down, error_rate_spike, failed_deploy).
- **Output:** `{ severity, category, short_reason }`.
- Fast, single LLM call. No tool use.

### 4.2 Investigator Agent
- **Input:** triage output + original alert.
- **Job:**
  1. Call MCP tools `fetch_logs(service_id)` and `get_recent_deploys(service_id)` to gather context.
  2. Search the sample repo to locate the most likely responsible file/function (match on error signature / stack trace / recently-changed files from the deploy diff). Use a **direct file/repo search — NOT MCP** for this part.
  3. Produce a root-cause hypothesis and a `confidence` score (0–1).
- **Output:** `{ hypothesis, suspected_file, suspected_function, confidence, evidence }`.
- **Branch:** if `confidence` < threshold (e.g. 0.5), the pipeline escalates to a human (Reporter still runs, but flags "needs human review" and skips auto-remediation).

### 4.3 Remediation Agent
- **Input:** investigator output.
- **Job:** run a RAG query over the past-incident vector store to retrieve the most similar prior incidents, then generate a suggested fix grounded in those retrieved cases (cite which past incident(s) informed the suggestion).
- **Output:** `{ suggested_fix, referenced_incidents }`.
- Uses MCP tool `get_runbook(category)` if a matching runbook exists.

### 4.4 Reporter Agent
- **Input:** all prior agent outputs.
- **Job:** draft a clear, plain-English summary formatted like a Slack/status update: what happened, where, suggested fix (or "needs human review" if escalated).
- **Output:** `{ summary_markdown }`.

---

## 5. Sample / Synthetic Data (build this first)

All data is self-made and controlled so the demo is reliable. Model formats loosely on real AIOps datasets (HDFS / GAIA-style logs) for realism, but keep them small and hand-authored.

1. **Sample target repo** — a small repo (can live in the project as a folder) with ~5–10 files and a handful of **intentionally planted bugs**, each tied to a known failure mode (e.g. a missing null check, a removed retry, an off-by-one, a bad DB timeout config).
2. **Alert scenarios** — ~10–15 hand-written alert payloads, each mapping to one planted bug. Example fields:
   ```json
   {
     "alert_id": "alrt_001",
     "service_id": "checkout-service",
     "type": "error_rate_spike",
     "message": "NullPointerException in processPayment",
     "timestamp": "...",
     "metric": { "error_rate": 0.34 }
   }
   ```
3. **Log snippets** — for each service, a small set of log lines (including the ones that point to the bug) returned by `fetch_logs`.
4. **Deploy history** — for each service, a short list of recent deploys (including the one that introduced the bug) returned by `get_recent_deploys`.
5. **Past-incidents / runbook store** — ~15–20 short past-incident write-ups (symptom → root cause → fix) to embed for RAG, plus a few runbooks keyed by category.

Because you author the alert→bug mapping, you can build a **labeled test set** (§8) and measure real accuracy honestly.

---

## 6. Custom MCP Server

Build a small MCP server exposing three tools over the synthetic data:
- `fetch_logs(service_id)` → returns the log snippet set for that service.
- `get_recent_deploys(service_id)` → returns recent deploy history for that service.
- `get_runbook(category)` → returns a matching runbook if one exists.

The Investigator and Remediation agents call these tools through the MCP interface rather than importing functions directly. **Build this LAST** — it is the least behavior-critical piece; if time runs short, agents can call the same functions directly and the MCP layer can be added after.

---

## 7. Frontend (Next.js on Vercel)

- **Scenario picker:** buttons for each pre-built incident scenario (e.g. "Database Timeout", "Memory Leak", "Failed Deploy"). No free-text input — this keeps the demo reliable and controls API cost.
- **Live reasoning trail:** as the pipeline runs, show each agent's step and its output in sequence.
- **Final panel:** located file/function, suggested fix, referenced past incidents (or a "needs human review" state when escalated).
- Calls the FastAPI backend over REST. Configure CORS on the backend for the Vercel domain.

---

## 8. Evaluation (do this — it produces the ONLY honest resume metric)

Because you control the alert→bug mapping, build a labeled test set and measure real numbers you can defend in an interview. Do **not** invent comparative percentages (e.g. "reduced MTTR by X%") — there's no real baseline for those.

Defensible metrics to compute:
- **Root-cause localization accuracy:** of N test scenarios, in how many did the Investigator name the correct file/function? (e.g. "correctly located the responsible file in 12/15 scenarios").
- **End-to-end latency:** average pipeline run time per scenario, if you time it.
- **Countable facts:** number of agents, number of runbooks/past incidents in the store — plainly true, no baseline needed.

Record these; they become the real metric on the resume bullet once the project is done.

---

## 9. Build Order (suggested, ~5 focused days with Claude Code)

1. **Day 1 — Scaffold + data:** FastAPI project, sample repo with planted bugs, alert scenarios, log/deploy/runbook fixtures.
2. **Day 1–2 — Triage + Reporter agents:** the two simplest agents; get a trivial end-to-end pipeline (alert → triage → reporter) running first so there's always something demoable.
3. **Day 2–3 — Investigator agent:** log/deploy retrieval + code-location logic + confidence score. This is the hardest part; budget prompt-iteration time against the labeled scenarios.
4. **Day 3–4 — Remediation agent + RAG:** embed past incidents into Chroma, retrieve similar cases, generate grounded fix.
5. **Day 4 — LangGraph orchestration:** wire the 4 agents together with the confidence branch (auto-continue vs. escalate-to-human).
6. **Day 4–5 — Next.js dashboard:** scenario picker, reasoning trail, final panel.
7. **Day 5 — Custom MCP server:** move log/deploy/runbook access behind MCP (build last; optional if time-constrained).
8. **Day 5 — Deploy + eval:** deploy frontend (Vercel) + backend (Render), configure CORS, run the labeled test set, record the real metric.
9. **After it works — understand it:** spend focused time reading through the code and re-explaining the architecture out loud as if in an interview (why 4 agents, why the confidence branch, why MCP here but not for code lookup, why RAG). This is required interview prep, not optional.

---

## 10. Key Design Decisions (keep these answers ready for interviews)

- **Why multi-agent, not one big prompt:** narrow, single-purpose agents are easier to improve and debug, and mirror how real incident-response roles are divided.
- **Why LangGraph:** the confidence-based escalation to a human is a genuine branching / human-in-the-loop requirement, which LangGraph is purpose-built for.
- **Why a custom MCP server:** log/deploy/runbook access is the kind of tooling multiple agents share, so a reusable tool interface fits the architecture better than hardcoded calls. (Also the least load-bearing piece — built last, cuttable.)
- **Why NOT MCP for code lookup:** a direct repo/file search does the same job with fewer moving parts; MCP there would add a dependency without adding capability.
- **Why RAG for remediation:** fixes should be grounded in what resolved similar incidents before, not invented — retrieval over past cases makes suggestions defensible.
- **Why Groq only:** free API, capable enough at demo scale, and keeps a public demo from costing money per click.
- **Why pre-set scenarios, not free-text:** reliability and cost control for a public demo.
