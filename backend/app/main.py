"""FastAPI entrypoint for the four-agent pipeline."""

import json
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from . import data_access
from .graph import stream_pipeline
from .models import Alert, PipelineResult
from .pipeline import run_pipeline

load_dotenv()

log = logging.getLogger(__name__)

app = FastAPI(title="On-Call Support Agent", version="0.4.0")

# The frontend is deployed on a different domain than the API, so origins are explicit.
allowed_origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class RunRequest(BaseModel):
    """Only a scenario id — the demo has no free-text input, per spec §7."""

    alert_id: str


@app.get("/health")
def health():
    return {"status": "ok", "version": app.version}


@app.get("/scenarios", response_model=list[Alert])
def scenarios():
    """Every preset scenario, for the dashboard's picker."""
    return data_access.list_alerts()


@app.post("/run", response_model=PipelineResult)
def run(request: RunRequest):
    """Run the pipeline for one scenario and return the finished result."""
    try:
        return run_pipeline(request.alert_id)
    except data_access.ScenarioNotFound:
        raise HTTPException(status_code=404, detail=f"no such alert: {request.alert_id}")
    except Exception as exc:
        # The upstream LLM call is the realistic failure here (rate limit, timeout). Surface
        # it as 502 rather than a 500 that looks like a bug in this service.
        log.exception("pipeline failed for %s", request.alert_id)
        raise HTTPException(status_code=502, detail=f"pipeline failed: {exc}") from exc


@app.post("/run/stream")
def run_stream(request: RunRequest):
    """Same run, streamed as server-sent events — one per agent as it finishes.

    This is what the §7 dashboard consumes for its reasoning trail. A full run takes tens of
    seconds, so the difference between this and /run is whether the user watches progress or
    watches a spinner.
    """
    try:
        data_access.load_alert(request.alert_id)
    except data_access.ScenarioNotFound:
        raise HTTPException(status_code=404, detail=f"no such alert: {request.alert_id}")

    def events():
        try:
            for node, update in stream_pipeline(request.alert_id):
                payload = {
                    "step": node,
                    "data": {
                        key: (value.model_dump() if hasattr(value, "model_dump") else value)
                        for key, value in update.items()
                        # started_at is an internal perf counter, meaningless to a client.
                        if key != "started_at"
                    },
                }
                yield f"event: step\ndata: {json.dumps(payload)}\n\n"
            yield "event: done\ndata: {}\n\n"
        except Exception as exc:
            log.exception("streamed pipeline failed for %s", request.alert_id)
            yield f"event: error\ndata: {json.dumps({'detail': str(exc)})}\n\n"

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
