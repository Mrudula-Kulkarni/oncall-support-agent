"use client";

import { readableMetrics } from "@/lib/metrics";
import type { Alert, TriageOutput } from "@/lib/types";
import { Card, CategoryBadge, SectionLabel, SeverityBadge } from "./ui";

/**
 * Shown as soon as an alert is picked, before anything runs.
 *
 * Picking used to fire the pipeline immediately, so an exploratory click spent three or four
 * LLM calls and there was no chance to read the alert first. Running is now a deliberate act,
 * which also matters against Groq's 8000 tokens-per-minute ceiling.
 *
 * Every field is labelled. An earlier version showed `alrt_010 · inventory-service ·
 * argocd-rollout-monitor · production` as a row of bare chips, which assumed the reader knew
 * what each one was; and the metrics were raw key-value pairs, where `error_rate 0.98` means
 * nothing until someone tells you it is 98 failures in every 100 requests.
 *
 * `alert.type` is NOT displayed before Triage runs — it holds the category Triage is about to
 * classify, so showing it would hand over the answer. The badges appear once Triage has
 * produced its own.
 */

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wider text-ink-faint">{label}</dt>
      <dd className="mt-0.5 truncate text-xs text-ink-dim">{value}</dd>
    </div>
  );
}

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
  const metrics = readableMetrics(alert.metric);

  return (
    <section>
      <SectionLabel>The alert</SectionLabel>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold leading-snug text-ink">
              {alert.title ?? alert.message}
            </h2>
            {triage && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <SeverityBadge severity={triage.severity} />
                <CategoryBadge category={triage.category} />
                <span className="text-[11px] text-ink-faint">— decided by Triage</span>
              </div>
            )}
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
                Analysing…
              </span>
            ) : hasRun ? (
              "Analyse again"
            ) : (
              "Analyse this alert"
            )}
          </button>
        </div>

        {/* what the numbers mean */}
        {metrics.length > 0 && (
          <div className="mt-5 grid gap-x-6 gap-y-4 border-t border-line pt-4 sm:grid-cols-2">
            {metrics.map((m) => (
              <div key={m.label} className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-ink-faint">
                    {m.label}
                  </span>
                  {m.baseline && (
                    <span className="text-[11px] text-ink-faint">({m.baseline})</span>
                  )}
                </div>
                <p
                  className={`mt-0.5 font-mono text-lg font-semibold tabular-nums ${
                    m.severe ? "text-rose-300" : "text-ink"
                  }`}
                >
                  {m.value}
                </p>
                {m.fill !== undefined && (
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full ${m.severe ? "bg-rose-400" : "bg-sky-400"}`}
                      style={{ width: `${Math.min(100, Math.round(m.fill * 100))}%` }}
                    />
                  </div>
                )}
                {m.meaning && (
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">{m.meaning}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* where it came from, and the raw text */}
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 sm:grid-cols-4">
          <Field label="Which service" value={alert.service_id} />
          <Field label="Raised by" value={alert.source ?? "—"} />
          <Field label="Environment" value={alert.environment ?? "—"} />
          <Field label="When" value={formatWhen(alert.timestamp)} />
        </dl>

        <details className="mt-4 group">
          <summary className="cursor-pointer list-none text-[11px] text-ink-faint transition-colors hover:text-ink-dim">
            <span className="group-open:hidden">▸ Show the raw alert text</span>
            <span className="hidden group-open:inline">▾ Hide the raw alert text</span>
          </summary>
          <p className="mt-2 border-l-2 border-line py-0.5 pl-3 font-mono text-[11px] leading-relaxed text-ink-faint">
            {alert.message}
          </p>
        </details>

        {!hasRun && !running && (
          <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
            Analysing takes roughly 10–40 seconds. Nothing is run against any system — the
            agents only ever suggest.
          </p>
        )}
      </Card>
    </section>
  );
}
