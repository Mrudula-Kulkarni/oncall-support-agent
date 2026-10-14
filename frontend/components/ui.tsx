import Link from "next/link";
import type { ReactNode } from "react";
import type { AlertCategory, Severity } from "@/lib/types";

/**
 * Shared primitives, light theme.
 *
 * Colour carries meaning rather than decorating: severity, alert category and run state each
 * have a ramp. Everything coloured also carries a text label, so hue is never the only thing
 * separating two states.
 */

const SEVERITY: Record<Severity, string> = {
  critical: "bg-red-50 text-red-700 ring-red-600/20",
  high: "bg-orange-50 text-orange-700 ring-orange-600/20",
  medium: "bg-amber-50 text-amber-700 ring-amber-600/20",
  low: "bg-stone-100 text-stone-600 ring-stone-500/20",
};

const SEVERITY_DOT: Record<Severity, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-stone-400",
};

export const CATEGORY: Record<AlertCategory, { label: string; className: string }> = {
  error_rate_spike: { label: "errors spiking", className: "bg-red-50 text-red-700 ring-red-600/20" },
  latency_spike: { label: "running slow", className: "bg-violet-50 text-violet-700 ring-violet-600/20" },
  service_down: { label: "service down", className: "bg-red-50 text-red-700 ring-red-600/25" },
  failed_deploy: { label: "bad deploy", className: "bg-amber-50 text-amber-700 ring-amber-600/20" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${SEVERITY[severity]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[severity]}`} />
      {severity}
    </span>
  );
}

export function CategoryBadge({ category }: { category: AlertCategory }) {
  const c = CATEGORY[category];
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${c.className}`}
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
  tone?: "default" | "brand";
}) {
  const tones = {
    default: "bg-stone-100 text-ink-2 ring-stone-300/60",
    brand: "bg-brand-soft text-brand-deep ring-indigo-300/50",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[13px] ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Confidence, with the 0.50 escalation threshold marked. */
export function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const weak = value < 0.5;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div className="relative h-2 w-36 overflow-hidden rounded-full bg-stone-200">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            weak ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-y-0 left-1/2 w-px bg-stone-400" />
      </div>
      <span
        className={`font-mono text-sm tabular-nums ${weak ? "text-amber-700" : "text-emerald-700"}`}
      >
        {value.toFixed(2)}
      </span>
      <span className="text-[13px] text-ink-3">
        {weak ? "below the 0.50 cut off, so this goes to a human" : "sure enough to suggest a fix"}
      </span>
    </div>
  );
}

const CARD_TONES = {
  plain: "bg-surface border-line",
  note: "bg-amber-50 border-amber-300",
  warn: "bg-red-50 border-red-200",
} as const;

export function Card({
  children,
  className = "",
  active = false,
  tone = "plain",
}: {
  children: ReactNode;
  className?: string;
  active?: boolean;
  /** Background and border together, so a caller cannot half-override one via className and
   * leave the result depending on stylesheet order. */
  tone?: keyof typeof CARD_TONES;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_-16px_rgba(28,25,23,0.18)] ${
        active ? "sweep border-indigo-300 bg-surface" : CARD_TONES[tone]
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
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-3">
        {children}
      </h2>
      {right}
    </div>
  );
}

export function Button({
  children,
  href,
  onClick,
  disabled,
  variant = "primary",
  size = "md",
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  size?: "md" | "lg";
}) {
  const sizes = {
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  } as const;
  const variants = {
    primary:
      "bg-brand text-white shadow-sm hover:bg-brand-deep focus-visible:outline-brand",
    secondary:
      "bg-surface text-ink ring-1 ring-inset ring-line-strong hover:bg-surface-2 focus-visible:outline-brand",
  } as const;
  const className = `inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${variants[variant]}`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  );
}

export function ArrowRight() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4">
      <path
        d="M3 8h9.5M9 4.5 12.5 8 9 11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
