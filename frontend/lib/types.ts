/**
 * Mirrors backend/app/models.py. Kept in step by hand — the backend is the source of truth,
 * and a mismatch shows up as a missing field in the UI rather than a type error, so these
 * names must match the Pydantic ones exactly.
 */

export type Severity = "critical" | "high" | "medium" | "low";

export type AlertCategory =
  | "latency_spike"
  | "service_down"
  | "error_rate_spike"
  | "failed_deploy";

export interface Alert {
  alert_id: string;
  service_id: string;
  type: AlertCategory;
  message: string;
  timestamp: string;
  source?: string | null;
  environment?: string | null;
  metric: Record<string, string | number>;
}

export interface TriageOutput {
  severity: Severity;
  category: AlertCategory;
  short_reason: string;
}

export interface InvestigatorOutput {
  hypothesis: string;
  suspected_file?: string | null;
  suspected_function?: string | null;
  confidence: number;
  evidence: string[];
}

export interface RemediationOutput {
  suggested_fix: string;
  referenced_incidents: string[];
}

export interface ReporterOutput {
  summary_markdown: string;
}

export interface PipelineResult {
  alert: Alert;
  triage?: TriageOutput | null;
  investigation?: InvestigatorOutput | null;
  remediation?: RemediationOutput | null;
  report?: ReporterOutput | null;
  escalated_to_human: boolean;
  duration_ms?: number | null;
}

/** Graph node names, in the order they run. `escalate` replaces `remediate` on a low-confidence run. */
export type StepName =
  | "load"
  | "triage"
  | "investigate"
  | "remediate"
  | "escalate"
  | "report";

/** One server-sent event from POST /run/stream. */
export interface StepEvent {
  step: StepName;
  data: {
    alert?: Alert;
    triage?: TriageOutput;
    investigation?: InvestigatorOutput;
    remediation?: RemediationOutput | null;
    report?: ReporterOutput;
    escalated_to_human?: boolean;
    duration_ms?: number;
  };
}
