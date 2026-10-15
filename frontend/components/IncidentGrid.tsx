"use client";

import { readableMetrics } from "@/lib/metrics";
import type { Alert } from "@/lib/types";
import { ArrowRight } from "./ui";

/**
 * What the Incidents page opens with: every alert as a card, full width.
 *
 * It used to be a list on the left and an empty panel on the right until something was
 * picked, so half the first screen was blank. Cards use the whole width and show each alert's
 * headline number up front, which gives a reason to pick one over another.
 *
 * As in the sidebar list, `alert.type` is not shown: it is the category Triage classifies.
 */

const SERVICE_BLURB: Record<string, string> = {
  "checkout-service": "the cart and the checkout flow",
  "payment-service": "card payments and refunds",
  "auth-service": "keeping shoppers signed in",
  "inventory-service": "stock levels and reservations",
  "notification-service": "order emails",
};

export function IncidentGrid({
  scenarios,
  onSelect,
}: {
  scenarios: Alert[];
  onSelect: (alertId: string) => void;
}) {
  const grouped: { service: string; alerts: Alert[] }[] = [];
  for (const alert of scenarios) {
    const existing = grouped.find((g) => g.service === alert.service_id);
    if (existing) existing.alerts.push(alert);
    else grouped.push({ service: alert.service_id, alerts: [alert] });
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Incidents</h1>
        <span className="text-sm text-ink-3">
          {scenarios.length} alerts across {grouped.length} services
        </span>
      </div>
      <p className="mt-1.5 text-sm text-ink-2">Pick one to see the agents work through it.</p>

      <div className="mt-8 space-y-8">
        {grouped.map(({ service, alerts }) => (
          <section key={service}>
            <div className="mb-3 flex items-baseline gap-2">
              <h2 className="font-mono text-sm font-semibold text-ink">{service}</h2>
              <span className="text-sm text-ink-3">· {SERVICE_BLURB[service] ?? ""}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {alerts.map((alert) => {
                const top = readableMetrics(alert.metric)[0];
                return (
                  <button
                    key={alert.alert_id}
                    onClick={() => onSelect(alert.alert_id)}
                    className="group flex flex-col rounded-xl border border-line bg-surface p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_10px_24px_-16px_rgba(79,70,229,0.45)]"
                  >
                    <span className="text-sm font-semibold leading-snug text-ink">
                      {alert.title ?? alert.message}
                    </span>

                    {top && (
                      <span className="mt-3 flex items-baseline gap-2">
                        <span
                          className={`font-mono text-lg font-semibold tabular-nums ${
                            top.severe ? "text-red-600" : "text-ink"
                          }`}
                        >
                          {top.value}
                        </span>
                        <span className="text-[13px] text-ink-3">{top.label.toLowerCase()}</span>
                      </span>
                    )}

                    <span className="mt-auto flex items-center gap-1 pt-3 text-[13px] font-medium text-ink-3 transition-colors group-hover:text-brand">
                      Open <ArrowRight />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
