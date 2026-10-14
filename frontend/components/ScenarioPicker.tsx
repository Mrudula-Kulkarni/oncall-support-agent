"use client";

import type { Alert } from "@/lib/types";
import { SectionLabel } from "./ui";

/**
 * Twelve preset alerts, per spec §7 — no free-text input, which keeps a public demo reliable
 * and its cost bounded.
 *
 * Grouped under the microservice that raised each one, because that is the unit the agents work
 * in: an alert belongs to one service, and the Investigator only searches that service's files.
 *
 * Each service had a colour at one point, purely to group the list visually. It carried no
 * meaning — not severity, not urgency — and readers reasonably assumed it did, so it is gone.
 * The heading does the grouping and says what the service is for.
 *
 * The alert's `type` is deliberately not shown. It holds the category Triage is being asked to
 * classify, so displaying it would make the classification look like a lookup.
 */

const SERVICE_BLURB: Record<string, string> = {
  "checkout-service": "runs the cart and the checkout flow",
  "payment-service": "charges cards and processes refunds",
  "auth-service": "keeps shoppers signed in",
  "inventory-service": "tracks stock levels and reservations",
  "notification-service": "sends order emails",
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
        Incidents
      </SectionLabel>

      <p className="mb-5 text-sm leading-relaxed text-ink-3">
        Twelve things that went wrong across the five microservices of a fictional online shop,
        grouped by which one raised the alert.
      </p>

      <div className="space-y-6">
        {grouped.map(({ service, alerts }) => (
          <div key={service}>
            <h3 className="font-mono text-sm font-semibold text-ink">{service}</h3>
            <p className="mb-2 mt-0.5 text-sm text-ink-3">{SERVICE_BLURB[service] ?? ""}</p>

            <div className="space-y-1.5">
              {alerts.map((alert) => {
                const isSelected = alert.alert_id === selected;
                return (
                  <button
                    key={alert.alert_id}
                    onClick={() => onSelect(alert.alert_id)}
                    disabled={running}
                    aria-current={isSelected}
                    className={`w-full rounded-lg border p-3 text-left text-sm font-medium leading-snug transition-all duration-150
                      ${
                        isSelected
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink"
                      }
                      disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    {alert.title ?? alert.message}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
