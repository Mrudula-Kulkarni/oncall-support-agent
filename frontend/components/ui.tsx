import type { ReactNode } from "react";
import type { Severity } from "@/lib/types";

/** Severity colours carry meaning here, so they are not decorative — keep them distinguishable
 * in both themes and never rely on hue alone (the label is always present). */
const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/30",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-300 ring-orange-500/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30",
  low: "bg-slate-500/15 text-slate-700 dark:text-slate-300 ring-slate-500/30",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${SEVERITY_STYLES[severity]}`}
    >
      {severity}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-500/10 px-2 py-0.5 font-mono text-xs text-slate-600 ring-1 ring-inset ring-slate-500/20 dark:text-slate-400">
      {children}
    </span>
  );
}

/** A confidence meter. The number is always shown as text — the bar is a secondary cue, and
 * the threshold marker is what makes the escalation decision legible. */
export function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const weak = value < 0.5;
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-slate-500/20">
        <div
          className={`h-full rounded-full ${weak ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
        {/* the 0.5 escalation threshold */}
        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-500/50" />
      </div>
      <span
        className={`font-mono text-xs ${weak ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-400"}`}
      >
        {value.toFixed(2)}
      </span>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white/60 dark:border-slate-800 dark:bg-slate-900/40 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">
      {children}
    </h2>
  );
}
