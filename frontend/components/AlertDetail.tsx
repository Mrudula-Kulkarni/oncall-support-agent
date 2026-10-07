"use client";

import type { Alert, TriageOutput } from "@/lib/types";
import { Card, CategoryBadge, Mono, SectionLabel, SeverityBadge, Stat } from "./ui";

/**
 * Shown as soon as a scenario is picked, before anything runs.
 *
 * Selecting a scenario used to fire the pipeline immediately, which meant an exploratory click
 * spent three or four LLM calls and there was no chance to read the alert first. Running is now
 * a deliberate act, which also matters against Groq's 8000 tokens-per-minute ceiling.
 *
 * `alert.type` is NOT displayed before Triage runs. It holds the category Triage is about to
 * classify — showing it here would hand over the answer and make the classification look like a
 * lookup. The badges appear only once Triage has produced its own.
 */

const METRIC_LABELS: Record<string, string> = {
  error_rate: "error rate",
  baseline_error_rate: "normal error rate",
  affected_requests_5m: "requests hit (5 min)",
  p99_latency_ms: "p99 latency",
  baseline_p99_latency_ms: "normal p99",
  memory_used_pct: "memory used",
  gc_pause_ms_p99: "GC pause (p99)",
  minutes_since_deploy: "minutes since deploy",
  deploy_id: "deploy",
  gateway_timeout_count_5m: "gateway timeouts (5 min)",
  db_statement_timeout_count_5m: "DB timeouts (5 min)",
  restart_count: "restarts",
  queue_depth: "queue depth",
};

function formatWhen(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function AlertDetail({
  alert,
  triage,
  running,
  hasRun,
  onRun,
}: {
  alert: Alert;
  triage?: TriageOutput | null;
  running: boolean;
  hasRun: boolean;
  onRun: () => void;
}) {
  return (
    <section>
      <SectionLabel
        right={
          <span className="font-mono text-[11px] text-ink-faint">
            {formatWhen(alert.timestamp)}
          </span>
        }
      >
        Incoming alert
      </SectionLabel>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold leading-snug text-ink">
              {alert.title ?? alert.message}
            </h2>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Mono tone="accent">{alert.alert_id}</Mono>
              <Mono>{alert.service_id}</Mono>
              {alert.source && <Mono>{alert.source}</Mono>}
              {alert.environment && <Mono>{alert.environment}</Mono>}
              {/* Only once Triage has produced them — never from alert.type. */}
              {triage && <SeverityBadge severity={triage.severity} />}
              {triage && <CategoryBadge category={triage.category} />}
            </div>
          </div>

          <button
            onClick={onRun}
            disabled={running}
            className={`shrink-0 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all duration-200
              ${
                running
                  ? "cursor-not-allowed bg-white/[0.04] text-ink-faint ring-1 ring-inset ring-line"
                  : "bg-sky-500 text-slate-950 shadow-[0_0_24px_-6px_rgba(56,189,248,0.7)] hover:bg-sky-400"
              }`}
          >
            {running ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                Running…
              </span>
            ) : hasRun ? (
              "Run again"
            ) : (
              "Run the pipeline"
            )}
          </button>
        </div>

        <p className="mt-4 border-l-2 border-line py-0.5 pl-3 font-mono text-[11px] leading-relaxed text-ink-faint">
          {alert.message}
        </p>

        {Object.keys(alert.metric).length > 0 && (
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 sm:grid-cols-3">
            {Object.entries(alert.metric).map(([key, value]) => (
              <Stat
                key={key}
                label={METRIC_LABELS[key] ?? key.replace(/_/g, " ")}
                value={String(value)}
              />
            ))}
          </dl>
        )}

        {!hasRun && !running && (
          <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
            Running makes three to four LLM calls and takes roughly 10–40 seconds. Nothing is
            executed against any system — the pipeline only ever suggests.
          </p>
        )}
      </Card>
    </section>
  );
}
