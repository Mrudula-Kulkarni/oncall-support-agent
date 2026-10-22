# Deploying

Both halves go to Render, from the one blueprint in `render.yaml`:

| Service | What it is | Free plan |
|---|---|---|
| `oncall-support-agent-api` | the FastAPI backend | sleeps after ~15 minutes idle |
| `oncall-support-agent` | the Next.js frontend, built to static files | never sleeps |

They live on different domains, which is why CORS is configured explicitly rather than left open.

## 1. Create both services

1. Sign in to [render.com](https://render.com) with GitHub.
2. **New → Blueprint**, pick this repo. Render reads `render.yaml` and lists both services.
3. It asks for the variables marked `sync: false`:

| Variable | Service | Value |
|---|---|---|
| `GROQ_API_KEY` | api | your Groq key |
| `CORS_ALLOWED_ORIGINS` | api | leave blank for now |
| `NEXT_PUBLIC_API_URL` | frontend | `https://oncall-support-agent-api.onrender.com` |

The API URL is predictable from the service name. If Render had to change the name because it
was taken, the real URL is on the api service's page; fix the variable and redeploy the frontend.

4. **Apply.** The backend takes 5 to 10 minutes to build.

## 2. Connect them

Copy the frontend's URL (likely `https://oncall-support-agent.onrender.com`), then on the api
service: **Environment → `CORS_ALLOWED_ORIGINS`** = that URL, no trailing slash. Save; Render
restarts the backend.

Until this is set, the site loads and every request fails with a CORS error in the browser
console. That looks like a bug and is not one.

`NEXT_PUBLIC_API_URL` is baked into the frontend at build time. Changing it later needs a
redeploy of the frontend (**Manual Deploy → Deploy latest commit**), not just an edit.

## 3. Verify

```bash
API=https://oncall-support-agent-api.onrender.com
SITE=https://oncall-support-agent.onrender.com

curl $API/health
curl -s $API/scenarios | python3 -c "import json,sys; print(len(json.load(sys.stdin)), 'scenarios')"
curl -s -D - -o /dev/null -H "Origin: $SITE" $API/scenarios | grep -i access-control-allow-origin
```

The last one must echo the site's URL. If it prints nothing, `CORS_ALLOWED_ORIGINS` is wrong.
Then open the site and run one alert end to end.

## What to expect on the free plan

**Cold starts.** The backend sleeps after inactivity, and the first request after that takes
30 to 60 seconds, plus a little more while the search index rebuilds. Before sending the link to
someone, open it yourself first.

**Rate limits.** Groq's free tier allows 8000 tokens per minute, and one Investigator call can
request ~3400. That is roughly two full runs per minute before a 429.

**Memory.** Chroma plus onnxruntime is the heaviest thing in the image, against a 512MB limit.
If it runs out, the lever is `rag.py`: `baseline_retrieval.py` shows keyword matching scores
within one scenario of the embeddings at recall@3, so dropping to it costs almost nothing here.

**Redeploys.** Every push to `main` redeploys both services.
