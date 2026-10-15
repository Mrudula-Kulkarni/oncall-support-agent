"use client";

import type { Alert } from "@/lib/types";

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
  "checkout-service": "the cart and the checkout flow",
  "payment-service": "card payments and refunds",
  "auth-service": "keeping shoppers signed in",
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
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-ink">Incidents</h1>
        <span className="text-sm text-ink-3">{scenarios.length} alerts</span>
      </div>

      <div className="space-y-4">
        {grouped.map(({ service, alerts }) => (
          <div key={service} className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="border-b border-line bg-surface-2 px-3.5 py-2">
              <h3 className="font-mono text-[13px] font-semibold text-ink">{service}</h3>
              <p className="text-[13px] text-ink-3">{SERVICE_BLURB[service] ?? ""}</p>
            </div>

            <ul className="divide-y divide-line">
              {alerts.map((alert) => {
                const isSelected = alert.alert_id === selected;
                return (
                  <li key={alert.alert_id}>
                    <button
                      onClick={() => onSelect(alert.alert_id)}
                      disabled={running}
                      aria-current={isSelected}
                      className={`relative w-full px-3.5 py-2.5 text-left text-sm leading-snug transition-colors
                        ${
                          isSelected
                            ? "bg-brand-soft font-medium text-brand-deep"
                            : "text-ink-2 hover:bg-canvas hover:text-ink"
                        }
                        disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {isSelected && (
                        <span className="absolute inset-y-0 left-0 w-0.5 bg-brand" />
                      )}
                      {alert.title ?? alert.message}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
