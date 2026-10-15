"use client";

import { readableMetrics } from "@/lib/metrics";
import type { Alert } from "@/lib/types";
import { ArrowRight } from "./ui";

/**
 * What the Incidents page opens with: every alert as a card, full width.
 *
 * It used to be a list on the left and an empty panel on the right until something was
 * picked, so half the first screen was blank. A table uses the whole width, and its columns
 * line the alerts up so they can be compared at a glance: what broke, where, and how badly.
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

export function IncidentTable({
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

      <div className="mt-6 overflow-hidden rounded-xl border border-line bg-surface">
        <div className="hidden grid-cols-[1fr_13rem_12rem_7rem_2rem] gap-4 border-b border-line bg-surface-2 px-5 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-ink-3 md:grid">
          <span>What broke</span>
          <span>Service</span>
          <span>How bad</span>
          <span>When</span>
          <span />
        </div>

        <ul className="divide-y divide-line">
          {grouped.flatMap(({ service, alerts }) =>
            alerts.map((alert) => {
              const top = readableMetrics(alert.metric)[0];
              return (
                <li key={alert.alert_id}>
                  <button
                    onClick={() => onSelect(alert.alert_id)}
                    className="group grid w-full items-center gap-x-4 gap-y-1 px-5 py-3.5 text-left transition-colors hover:bg-brand-soft/60 md:grid-cols-[1fr_13rem_12rem_7rem_2rem]"
                  >
                    <span className="text-sm font-medium text-ink group-hover:text-brand-deep">
                      {alert.title ?? alert.message}
                    </span>

                    <span className="min-w-0">
                      <span className="block font-mono text-[13px] text-ink-2">{service}</span>
                      <span className="block truncate text-[12px] text-ink-3">
                        {SERVICE_BLURB[service] ?? ""}
                      </span>
                    </span>

                    <span className="flex items-baseline gap-2">
                      {top && (
                        <>
                          <span
                            className={`font-mono text-sm font-semibold tabular-nums ${
                              top.severe ? "text-red-600" : "text-ink"
                            }`}
                          >
                            {top.value}
                          </span>
                          <span className="text-[13px] text-ink-3">
                            {top.label.toLowerCase()}
                          </span>
                        </>
                      )}
                    </span>

                    <span className="text-[13px] tabular-nums text-ink-3">
                      {formatWhen(alert.timestamp)}
                    </span>

                    <span className="hidden justify-end text-ink-3 transition-all group-hover:translate-x-0.5 group-hover:text-brand md:flex">
                      <ArrowRight />
                    </span>
                  </button>
                </li>
              );
            }),
          )}
        </ul>
      </div>
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
