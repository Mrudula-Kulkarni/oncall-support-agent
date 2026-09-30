"""FastAPI entrypoint. Remediation and Investigator stages are added in later phases."""

import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import data_access
from .models import Alert, PipelineResult
from .pipeline import run_pipeline

load_dotenv()

log = logging.getLogger(__name__)

app = FastAPI(title="On-Call Support Agent", version="0.2.0")

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
    """Run the pipeline for one scenario."""
    try:
        return run_pipeline(request.alert_id)
    except data_access.ScenarioNotFound:
        raise HTTPException(status_code=404, detail=f"no such alert: {request.alert_id}")
    except Exception as exc:
        # The upstream LLM call is the realistic failure here (rate limit, timeout). Surface
        # it as 502 rather than a 500 that looks like a bug in this service.
        log.exception("pipeline failed for %s", request.alert_id)
        raise HTTPException(status_code=502, detail=f"pipeline failed: {exc}") from exc
