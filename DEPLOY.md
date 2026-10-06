# Deploying

Backend to Render, frontend to Vercel, per spec §9.8. The two live on different domains, which
is why CORS is configured explicitly rather than left open.

Both steps need accounts and cannot be scripted from here — they are the one part of this
project that is not reproducible from the repo alone.

## 1. Backend (Render)

`render.yaml` is a blueprint: point Render at this repo and it reads the service definition.

Set two environment variables in the dashboard, both marked `sync: false` so they are never
committed:

| Variable | Value |
|---|---|
| `GROQ_API_KEY` | your key |
| `CORS_ALLOWED_ORIGINS` | the Vercel URL, once step 2 gives you one |

Chicken-and-egg: you do not have the Vercel URL yet. Deploy the backend first, deploy the
frontend, then come back and set `CORS_ALLOWED_ORIGINS`. Until you do, the dashboard will load
and then fail every request with a CORS error in the browser console — which looks like a bug
and is not one.

Verify:

```bash
curl https://<your-render-url>/health
curl -s -D - -o /dev/null -H "Origin: https://<your-vercel-url>" \
     https://<your-render-url>/scenarios | grep -i access-control-allow-origin
```

The second must echo your Vercel origin. If it prints nothing, `CORS_ALLOWED_ORIGINS` is wrong.

## 2. Frontend (Vercel)

Import the repo and set **Root Directory** to `frontend` — without that, Vercel builds from the
repo root and finds no Next.js app.

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | your Render URL, no trailing slash |

It must be `NEXT_PUBLIC_`-prefixed: the dashboard calls the API from the browser, so the value is
baked into the client bundle at build time. Changing it later requires a redeploy, not just an
environment edit.

## What to expect on free tiers

**Cold starts.** A Render free instance sleeps after inactivity. The first request to a link
that has been idle takes roughly 30 seconds before any agent runs. For a demo you are sending to
someone, open it yourself first.

**Rate limits.** Groq's free tier allows 8000 tokens per minute, and one Investigator call can
request ~3400. That is roughly two full runs per minute before a 429. The dashboard surfaces the
upstream message rather than hanging, but do not click three scenarios in a row while someone is
watching.

**Memory.** Chroma plus onnxruntime is the heaviest thing in the image. If the free instance
runs out of memory, the lever is `rag.py` — the corpus is 18 documents and `baseline_retrieval.py`
shows keyword matching scores within one scenario of the embeddings at recall@3, so dropping to
the keyword path costs almost nothing measurable on this data.

## Verifying the deployment

```bash
# backend alive
curl https://<render-url>/health

# scenarios load
curl -s https://<render-url>/scenarios | python3 -c "import json,sys; print(len(json.load(sys.stdin)), 'scenarios')"

# a full run, streamed
curl -sN -X POST https://<render-url>/run/stream \
  -H 'Content-Type: application/json' -d '{"alert_id":"alrt_009"}' | head -20
```

Then open the Vercel URL and run one scenario end to end.
