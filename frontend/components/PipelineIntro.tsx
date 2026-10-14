import Link from "next/link";
import { Card } from "./ui";

/**
 * Shown before an alert is picked.
 *
 * Deliberately short. The landing page explains the four agents and the data in full, so
 * repeating it here would be the same text twice for anyone who arrived that way — and this
 * page's job is to get someone running something, not to re-teach the system. Enough context
 * for a visitor who landed here directly, and a link for the rest.
 */

const STEPS = [
  { n: 1, name: "Triage", line: "severity and failure category", tint: "bg-sky-50 text-sky-700 ring-sky-600/20" },
  { n: 2, name: "Investigator", line: "the file and function at fault", tint: "bg-violet-50 text-violet-700 ring-violet-600/20" },
  { n: 3, name: "Remediation", line: "a fix grounded in a past incident", tint: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  { n: 4, name: "Reporter", line: "the summary for the on-call channel", tint: "bg-amber-50 text-amber-700 ring-amber-600/20" },
];

export function PipelineIntro() {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-ink">Pick an alert on the left</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">
        Four agents run in sequence, and each result appears as it completes rather than all at
        the end. Three to four model calls, roughly ten to forty seconds.
      </p>

      <ol className="mt-6 grid gap-3 sm:grid-cols-2">
        {STEPS.map((step) => (
          <li key={step.name} className="flex items-center gap-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ring-1 ring-inset ${step.tint}`}
            >
              {step.n}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{step.name}</p>
              <p className="truncate text-sm text-ink-3">{step.line}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-6 border-t border-line pt-4 text-sm text-ink-3">
        Below 0.50 confidence the run escalates to a human and skips remediation.{" "}
        <Link href="/" className="font-medium text-brand hover:text-brand-deep">
          More on how it works →
        </Link>
      </p>
    </Card>
  );
}
