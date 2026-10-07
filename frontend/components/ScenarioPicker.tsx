"use client";

import type { Alert } from "@/lib/types";
import { CATEGORY, Mono, SectionLabel } from "./ui";

/**
 * Preset scenarios only, per spec §7 — no free-text input, which keeps a public demo reliable
 * and its cost bounded.
 *
 * The alert's `type` is deliberately NOT shown. It holds the category Triage is being asked to
 * classify, so displaying it next to Triage's answer would make the classification look like a
 * lookup. The backend withholds the same field from the prompt for the same reason — which is
 * also why the coloured bar on each card is keyed to the service, not the category.
 */

/** Stable per-service accent, so the eye groups the twelve scenarios by the five services. */
const SERVICE_BAR: Record<string, string> = {
  "checkout-service": "bg-sky-400",
  "payment-service": "bg-emerald-400",
  "auth-service": "bg-violet-400",
  "inventory-service": "bg-amber-400",
  "notification-service": "bg-pink-400",
};

export function ScenarioPicker({
  scenarios,
  selected,
  running,
  onSelect,
}: {
  scenarios: Alert[];
  selected: string | null;
  running: boolean;
  onSelect: (alertId: string) => void;
}) {
  const services = new Set(scenarios.map((s) => s.service_id));

  return (
    <div>
      <SectionLabel
        right={
          <span className="font-mono text-[11px] text-ink-faint">
            {scenarios.length} / {services.size} services
          </span>
        }
      >
        Scenarios
      </SectionLabel>

      <div className="space-y-1.5">
        {scenarios.map((alert) => {
          const isSelected = alert.alert_id === selected;
          const bar = SERVICE_BAR[alert.service_id] ?? "bg-slate-500";
          return (
            <button
              key={alert.alert_id}
              onClick={() => onSelect(alert.alert_id)}
              disabled={running}
              aria-current={isSelected}
              className={`group relative w-full overflow-hidden rounded-lg border p-3 pl-4 text-left transition-all duration-200
                ${
                  isSelected
                    ? "border-sky-500/40 bg-sky-500/[0.07] shadow-[0_0_0_1px_rgba(56,189,248,0.15)]"
                    : "border-line bg-surface/50 hover:border-line-bright hover:bg-surface-2/70"
                }
                disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {/* service accent rail */}
              <span
                className={`absolute inset-y-0 left-0 w-[3px] ${bar} ${
                  isSelected ? "opacity-100" : "opacity-45 group-hover:opacity-80"
                } transition-opacity`}
              />
              <div className="flex items-center justify-between gap-2">
                <Mono tone={isSelected ? "accent" : "default"}>{alert.alert_id}</Mono>
                <span className="truncate font-mono text-[11px] text-ink-faint">
                  {alert.service_id.replace("-service", "")}
                </span>
              </div>
              <p
                className={`mt-2 line-clamp-2 text-[13px] leading-snug transition-colors ${
                  isSelected ? "text-ink" : "text-ink-dim group-hover:text-ink"
                }`}
              >
                {alert.message}
              </p>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
        Preset scenarios only — no free-text input, so the demo stays reliable and its API cost
        is bounded.
      </p>
    </div>
  );
}

export { CATEGORY };
