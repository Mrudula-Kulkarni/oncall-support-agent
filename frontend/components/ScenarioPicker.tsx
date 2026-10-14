"use client";

import type { Alert } from "@/lib/types";
import { SectionLabel } from "./ui";

/**
 * Twelve preset alerts, per spec §7 — no free-text input, which keeps a public demo reliable
 * and its cost bounded.
 *
 * Grouped under a named service heading rather than listed flat with a coloured bar. The colour
 * was carrying the grouping on its own, which made it look like it encoded severity or urgency
 * while in fact encoding nothing a reader could see. A heading says what the colour means.
 *
 * The alert's `type` is deliberately not shown. It holds the category Triage is being asked to
 * classify, so displaying it would make the classification look like a lookup.
 */

const SERVICE_ACCENT: Record<string, string> = {
  "checkout-service": "bg-sky-400",
  "payment-service": "bg-emerald-400",
  "auth-service": "bg-violet-400",
  "inventory-service": "bg-amber-400",
  "notification-service": "bg-pink-400",
};

/** What each service is for — the names alone assume you already know the system. */
const SERVICE_BLURB: Record<string, string> = {
  "checkout-service": "the cart and checkout flow",
  "payment-service": "card payments and refunds",
  "auth-service": "keeping shoppers logged in",
  "inventory-service": "stock levels and reservations",
  "notification-service": "order emails",
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
  // Preserve the order services first appear in, so the list is stable across renders.
  const grouped: { service: string; alerts: Alert[] }[] = [];
  for (const alert of scenarios) {
    const existing = grouped.find((g) => g.service === alert.service_id);
    if (existing) existing.alerts.push(alert);
    else grouped.push({ service: alert.service_id, alerts: [alert] });
  }

  return (
    <div>
      <SectionLabel
        right={
          <span className="font-mono text-sm text-ink-3">{scenarios.length} alerts</span>
        }
      >
        Pick an alert
      </SectionLabel>

      <p className="mb-4 text-sm leading-relaxed text-ink-3">
        Twelve things that went wrong at a made-up online shop, grouped by which part of it
        broke.
      </p>

      <div className="space-y-5">
        {grouped.map(({ service, alerts }) => {
          const accent = SERVICE_ACCENT[service] ?? "bg-slate-500";
          return (
            <div key={service}>
              <div className="mb-2 flex items-baseline gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${accent}`} />
                <h3 className="text-sm font-semibold text-ink">
                  {service.replace("-service", "")}
                </h3>
                <span className="truncate text-sm text-ink-3">
                  {SERVICE_BLURB[service] ?? ""}
                </span>
              </div>

              <div className="space-y-1.5">
                {alerts.map((alert) => {
                  const isSelected = alert.alert_id === selected;
                  return (
                    <button
                      key={alert.alert_id}
                      onClick={() => onSelect(alert.alert_id)}
                      disabled={running}
                      aria-current={isSelected}
                      className={`group relative w-full overflow-hidden rounded-lg border p-3 pl-4 text-left transition-all duration-200
                        ${
                          isSelected
                            ? "border-indigo-400 bg-brand-soft shadow-[0_0_0_1px_rgba(56,189,248,0.15)]"
                            : "border-line bg-surface hover:border-line-strong hover:bg-surface-2"
                        }
                        disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      <span
                        className={`absolute inset-y-0 left-0 w-[3px] ${accent} ${
                          isSelected ? "opacity-100" : "opacity-40 group-hover:opacity-80"
                        } transition-opacity`}
                      />
                      <p
                        className={`text-sm font-medium leading-snug transition-colors ${
                          isSelected ? "text-ink" : "text-ink-2 group-hover:text-ink"
                        }`}
                      >
                        {alert.title ?? alert.message}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
