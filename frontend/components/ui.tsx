import type { ReactNode } from "react";
import type { AlertCategory, Severity } from "@/lib/types";

/**
 * Colour carries meaning on this page rather than decorating it: severity, alert category and
 * run state each have their own ramp. Every coloured element also carries a text label, so hue
 * is never the only thing distinguishing two states.
 */

const SEVERITY: Record<Severity, { ring: string; text: string; dot: string }> = {
  critical: {
    ring: "bg-rose-500/12 ring-rose-500/35",
    text: "text-rose-300",
    dot: "bg-rose-400",
  },
  high: {
    ring: "bg-orange-500/12 ring-orange-500/35",
    text: "text-orange-300",
    dot: "bg-orange-400",
  },
  medium: {
    ring: "bg-amber-400/12 ring-amber-400/35",
    text: "text-amber-300",
    dot: "bg-amber-400",
  },
  low: {
    ring: "bg-slate-400/12 ring-slate-400/30",
    text: "text-slate-300",
    dot: "bg-slate-400",
  },
};

export const CATEGORY: Record<AlertCategory, { label: string; text: string; bg: string; bar: string }> = {
  error_rate_spike: {
    label: "error rate",
    text: "text-rose-300",
    bg: "bg-rose-500/10 ring-rose-500/25",
    bar: "bg-rose-400",
  },
  latency_spike: {
    label: "latency",
    text: "text-violet-300",
    bg: "bg-violet-500/10 ring-violet-500/25",
    bar: "bg-violet-400",
  },
  service_down: {
    label: "service down",
    text: "text-red-300",
    bg: "bg-red-500/10 ring-red-500/30",
    bar: "bg-red-500",
  },
  failed_deploy: {
    label: "failed deploy",
    text: "text-amber-300",
    bg: "bg-amber-400/10 ring-amber-400/25",
    bar: "bg-amber-400",
  },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEVERITY[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset ${s.ring} ${s.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {severity}
    </span>
  );
}

export function CategoryBadge({ category }: { category: AlertCategory }) {
  const c = CATEGORY[category];
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium tracking-wide ring-1 ring-inset ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}

export function Mono({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "accent";
}) {
  const tones = {
    default: "bg-white/[0.04] text-ink-dim ring-line",
    accent: "bg-sky-500/10 text-sky-300 ring-sky-500/25",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Confidence, with the 0.50 escalation threshold marked. Below it the pipeline stops and asks
 * for a human, so the number needs to be legible, not merely present. */
export function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const weak = value < 0.5;
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-1.5 w-32 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            weak
              ? "bg-gradient-to-r from-amber-500 to-amber-300"
              : "bg-gradient-to-r from-emerald-500 to-emerald-300"
          }`}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/25" />
      </div>
      <span
        className={`font-mono text-xs tabular-nums ${weak ? "text-amber-300" : "text-emerald-300"}`}
      >
        {value.toFixed(2)}
      </span>
      <span className="text-[11px] text-ink-faint">
        {weak ? "below threshold" : "confident"}
      </span>
    </div>
  );
}

export function Card({
  children,
  className = "",
  active = false,
}: {
  children: ReactNode;
  className?: string;
  active?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-line bg-surface/80 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_12px_32px_-18px_rgba(0,0,0,0.9)] backdrop-blur-sm ${
        active ? "sweep border-sky-500/30" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionLabel({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        {children}
      </h2>
      {right}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] uppercase tracking-wider text-ink-faint">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono text-sm tabular-nums text-ink">{value}</dd>
    </div>
  );
}
