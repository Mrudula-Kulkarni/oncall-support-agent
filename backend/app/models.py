"""Structured I/O contracts for every agent in the pipeline.

Defined up front so each agent can be built and tested against an agreed shape.
Field names follow the build spec (section 4).
"""

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class AlertCategory(str, Enum):
    LATENCY_SPIKE = "latency_spike"
    SERVICE_DOWN = "service_down"
    ERROR_RATE_SPIKE = "error_rate_spike"
    FAILED_DEPLOY = "failed_deploy"


class Alert(BaseModel):
    alert_id: str
    # A plain-English headline for humans. Deliberately absent from triage.VISIBLE_FIELDS: it is
    # a UI label, and feeding it to the classifier would change what the eval measures.
    title: Optional[str] = None
    service_id: str
    type: str
    message: str
    timestamp: str
    source: Optional[str] = None
    environment: Optional[str] = None
    metric: dict[str, Any] = Field(default_factory=dict)


class TriageOutput(BaseModel):
    severity: Severity
    category: AlertCategory
    short_reason: str


class InvestigatorOutput(BaseModel):
    hypothesis: str
    suspected_file: Optional[str] = None
    suspected_function: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: list[str] = Field(default_factory=list)


class RemediationOutput(BaseModel):
    suggested_fix: str
    referenced_incidents: list[str] = Field(default_factory=list)


class ReporterOutput(BaseModel):
    summary_markdown: str


class PipelineResult(BaseModel):
    """Everything the dashboard needs to render one run."""

    alert: Alert
    triage: Optional[TriageOutput] = None
    investigation: Optional[InvestigatorOutput] = None
    remediation: Optional[RemediationOutput] = None
    report: Optional[ReporterOutput] = None
    escalated_to_human: bool = False
    duration_ms: Optional[int] = None
