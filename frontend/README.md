# Dashboard

Next.js dashboard for the On-Call Support Agent (spec §7). Deployed target is Vercel; it talks
to the FastAPI backend over REST and server-sent events.

## Running it

The backend must be up first — the dashboard has no data of its own.

```bash
# terminal 1
cd backend
./.venv/bin/python -m uvicorn app.main:app --reload

# terminal 2
cd frontend
cp .env.local.example .env.local      # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev                            # http://localhost:3000
```

## What it shows

| Piece | Source |
|---|---|
| Scenario picker — 12 presets, no free-text input | `GET /scenarios` |
| Live reasoning trail — each agent as it finishes | `POST /run/stream` (SSE) |
| Final panel — located file, suggested fix, cited incidents | the stream's accumulated state |

A run makes three to four LLM calls and takes roughly 10-40 seconds, which is why the trail
streams rather than waiting for a single response. The escalated branch — confidence below 0.50,
so no fix is proposed — renders as a first-class outcome, not an error.

## Notes

`EventSource` is not usable here: it only issues GET, and starting a run is a POST with a body.
`lib/api.ts` reads the fetch body stream and parses the SSE framing directly.

`lib/types.ts` mirrors `backend/app/models.py` by hand. The backend is the source of truth; a
drift shows up as a missing field in the UI rather than a type error, so the names must match.

Groq's free tier allows 8000 tokens per minute and one Investigator call can request ~3400, so
clicking two scenarios in quick succession can return a 429. The UI surfaces the upstream message
rather than hanging.

## Deploying

Set `NEXT_PUBLIC_API_URL` to the Render backend URL in Vercel's environment settings, and add the
Vercel origin to `CORS_ALLOWED_ORIGINS` in the backend environment — the two run on different
domains, which is why CORS is configured explicitly (spec §7).
