"use client";

import type { Alert } from "@/lib/types";
import { SectionLabel, Tag } from "./ui";

/**
 * Preset scenarios only, per spec §7 — no free-text input. That keeps a public demo reliable
 * and its API cost bounded, and it is a deliberate choice rather than a missing feature.
 *
 * The alert's `type` is deliberately NOT shown. It holds the category Triage is being asked to
 * classify, so displaying it next to Triage's answer would make the classification look like a
 * lookup. The backend withholds the same field from the prompt for the same reason.
 */
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
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <SectionLabel>Scenarios</SectionLabel>
        <span className="text-xs text-slate-500">{scenarios.length} preset</span>
      </div>

      <div className="space-y-2">
        {scenarios.map((alert) => {
          const isSelected = alert.alert_id === selected;
          return (
            <button
              key={alert.alert_id}
              onClick={() => onSelect(alert.alert_id)}
              disabled={running}
              aria-current={isSelected}
              className={`w-full rounded-lg border p-3 text-left transition
                ${
                  isSelected
                    ? "border-sky-500/60 bg-sky-500/10"
                    : "border-slate-200 bg-white/40 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-slate-700 dark:hover:bg-slate-900/60"
                }
                disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <div className="flex items-center gap-2">
                <Tag>{alert.alert_id}</Tag>
                <span className="truncate text-xs text-slate-500">
                  {alert.service_id}
                </span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-sm text-slate-700 dark:text-slate-300">
                {alert.message}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
