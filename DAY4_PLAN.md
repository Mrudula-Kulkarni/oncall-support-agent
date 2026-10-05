# Day 4 — Remediation + RAG, and LangGraph orchestration

**Status: complete (2026-10-05).** Source of truth: `OnCall_Support_Agent_Build_Spec.md`
(§4.3 Remediation, §9.4 RAG, §9.5 orchestration, §7 frontend).

| Spec item | State |
|---|---|
| §9.4 — Remediation agent + RAG over past incidents | done |
| §9.5 — LangGraph orchestration with the confidence branch | done |
| §7 / §9.6 — Next.js dashboard | done |

All four agents run end to end, `POST /run/stream` streams each as it finishes, and the
dashboard renders the trail live.

---

## The finding that shapes this phase

**Retrieval was already solved before Chroma existed.** `baseline_retrieval.py` measures what
trivial methods score on the same task, using only what is available at runtime:

| Method | recall@1 | recall@3 |
|---|---|---|
| Category filter alone | 5/12 | 11/12 |
| Keyword overlap, no embeddings | 8/12 | 11/12 |
| Keyword overlap + labelled `bug_type` *(ceiling, uses the answer key)* | 11/12 | 12/12 |
| **Chroma (all-MiniLM-L6-v2)** | **7/12** | **12/12** |

Chroma is **worse at rank 1** and **better at rank 3**, which nets out to +1 scenario at the k the
agent actually retrieves. That is a tie in all but name, and the reason is structural rather than
fixable: the corpus is 18 documents, and the eight mirroring incidents were authored in the same
vocabulary as the alerts they mirror. `alrt_003` says "memory at 94% of limit and climbing";
`inc_002` says "memory sat above 90% of its limit". Embeddings earn their keep by bridging
vocabulary gaps, and there is no gap here to bridge.

**How to talk about this.** Not "implemented RAG, 12/12 retrieval" — that number is real but
unearned, and an interviewer who asks "compared to what?" gets a worse answer than one who is
told up front. The honest version: retrieval ties a keyword baseline at this corpus size, the
vector store is the right structure for the problem as it grows, and embeddings would pull ahead
with paraphrase, a larger corpus, or incidents not written in the alert's own words. That answer
demonstrates the judgment the metric does not.

Chroma is kept rather than replaced by the keyword matcher: something has to select the grounding
incidents, the vector store is the structure that scales, and `rag.py` is a 130-line module whose
cost is a local model download rather than an API bill.

---

## What got built

| File | Role |
|---|---|
| `backend/app/rag.py` | Chroma index over the 18 incidents. Local embedding via onnxruntime — no embedding API |
| `backend/app/agents/remediation.py` | §4.3 — retrieve, then propose a fix citing what resolved a similar case |
| `backend/app/graph.py` | §9.5 — the four agents as a LangGraph, with the confidence branch and a streaming interface |
| `backend/app/main.py` | `POST /run/stream`, server-sent events, one per agent |
| `backend/baseline_retrieval.py` | The no-embedding floor |
| `backend/eval_retrieval.py` | Chroma against that floor, on identical input |
| `backend/eval_remediation.py` | Whether the fix cited the right prior incident |
| `backend/verify_day4.sh` | Mechanical checks for this phase |

### Grounding is enforced in code, not trusted to the prompt

`referenced_incidents` is filtered to ids retrieval actually returned. A fix citing an incident
the model invented — or recalled from pretraining — would read as grounded while being nothing of
the kind, and the citation is this agent's entire claim. A proposal with no surviving citation is
labelled ungrounded rather than presented as evidence-based.

### Why LangGraph, honestly

Spec §10 justifies it by "a genuine branching / human-in-the-loop requirement". That branch is one
comparison against a threshold, and `pipeline.py` expresses it in a single conditional that is
easier to read. A graph framework for one `if` would be cargo cult, and worth saying so.

What the graph actually buys is **streaming**. A plain function returns once, after the whole run.
`stream_pipeline()` yields each node as it completes — measured at triage 586ms, located file
2.2s, fix 3.7s, report 5.7s — which is what makes the §7 reasoning trail possible. That is a real
capability the function version does not have, and it is the defensible answer to "why LangGraph".

`pipeline.py` is kept as the synchronous reference path: `POST /run` and every eval use it. Two
ways to run the same four agents, where the graph adds observability rather than replacing logic.

---

## Grounding: the one metric here that is not saturated

`eval_remediation.py`, full clean run:

| Measure | Value |
|---|---|
| Grounded in some retrieved incident | 12/12 |
| Cited the expected mirror | 12/12 |
| Citation precision | **12/12** |

Precision is the number that carries weight. Retrieval hands the agent three candidates and it
cited exactly the right one every time, never padding the list — a "cite everything retrieved"
strategy would score 12/36 = 33%. Unlike retrieval, there is no trivial baseline that reaches
this, because the work is choosing among three plausible cases rather than finding them.

Read alongside the retrieval tie, the split is informative: retrieval on this corpus is easy, and
selecting and using the right precedent is where the agent adds something.

---

## The dashboard (§7)

Next.js 16, Tailwind v4, deployed target Vercel. Three pieces the spec asks for:

- **Scenario picker** — the 12 presets from `GET /scenarios`. No free-text input, per §7, which
  keeps a public demo reliable and its cost bounded. The alert's `type` field is deliberately not
  displayed: it holds the category Triage is being asked to produce, and showing it beside
  Triage's answer would make a classification look like a lookup.
- **Live reasoning trail** — consumes `POST /run/stream`. Each agent's output appears as it
  lands, with a confidence meter marked at the 0.5 escalation threshold. This is the payoff for
  LangGraph: a run takes tens of seconds, so the alternative is a spinner.
- **Final panel** — located file and function, the suggested fix rendered from markdown, and the
  incidents it cited. Escalation renders as a first-class outcome rather than an error, because
  that is what it is.

`EventSource` is not usable for the stream: it only issues GET and the run is a POST with a body,
so `lib/api.ts` parses the SSE framing off the fetch body stream by hand.

Verified end to end against the live backend by driving headless Chrome over CDP — scenarios
load, a click starts the run, and the trail fills in agent by agent.

---

## Problems found and fixed

1. **The citation validator knew only one of two identifier schemes.** Incidents are named twice
   — `inc_002_unbounded_cache_oom` as a filename, `INC-2026-0233` in their own frontmatter — and
   the model naturally cites the one the document uses for itself. The validator recognised only
   the stem, so it dropped a correct citation and then appended "this proposal is not grounded in
   a retrieved past incident" to a fix that demonstrably was. Both forms are now carried through
   retrieval and normalised to the stem the eval scores against. Same class of bug as
   `defined_symbols` on Day 3: two naming conventions in one corpus, code that knew one.
2. **Day 3's three false escalations are confirmed gone.** The re-run that was interrupted
   finished: file 12/12, **file+function 12/12** (was 11/12), **escalated 0/12** (was 3/12). The
   Day 3 commit recorded the conservative numbers; these are the corrected ones.

---

## How to verify

```bash
cd backend
./verify_day1.sh            # free
./verify_day2.sh            # Groq calls
./verify_day4.sh            # Groq calls; the retrieval checks are free

# measured separately, ~24 Groq calls each, so rate limits apply
./.venv/bin/python baseline_retrieval.py
./.venv/bin/python eval_retrieval.py
./.venv/bin/python eval_remediation.py -v
```

`chroma_db/` is gitignored and rebuilt from `data/incidents/` on first use. `rag.reset()` drops it
after a fixture edit; the index also rebuilds itself whenever its document count disagrees with
the corpus, so a stale index cannot silently answer queries.

### By judgment

- **Is the fix actionable?** It should name the file, the function and the change. "Add
  monitoring" is not a fix.
- **Is the citation load-bearing?** Read the cited incident's **Fix** section and check the
  proposal actually derives from it, rather than citing it decoratively.
- **Does it refuse to over-reach?** Three retrieved incidents do not mean three are relevant. One
  real precedent cited is better than three loose ones.

---

## Open problems

**Latency, still.** A full four-agent run measured 5.5s at best and 16s typical, against 25-40s
during the Day 3 eval — the variance is the Investigator's reasoning tokens. The §7 dashboard
makes this visible, and `/run/stream` mitigates it (the user watches progress rather than a
spinner) without fixing it. The lever remains prompt size: the Investigator receives the whole
log, the whole deploy history and the full source of every candidate.

**Groq free-tier rate limits** are a demo constraint, not just an eval annoyance. The ceiling is
8000 tokens per minute, and a single Investigator call requested 3414 of them — so roughly two
full pipeline runs per minute before a 429. A live demo that gets clicked twice in quick
succession will hit it. The dashboard surfaces this honestly (the run fails with the upstream
message and a hint to retry) rather than hanging, but the real fix is the same prompt-size work
that would address latency: the Investigator receives the entire log, the entire deploy history
and the full source of every candidate.

Both evals have now had clean full runs: retrieval +1 at recall@3, grounding 12/12 on all three
measures.

---

## Next: the dashboard (§7, spec item 6)

The last item of Day 4 and the first of Day 5. Scenario picker over `GET /scenarios`, live
reasoning trail over `POST /run/stream`, final panel showing the located file, the suggested fix
and the cited incidents — plus the escalated state, which is a real branch the UI has to render
rather than an error.
