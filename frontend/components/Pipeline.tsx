/**
 * The four agents, as the thing that happens to one alert.
 *
 * Vertical, and it lives in the hero rather than in a section further down. That placement is
 * the point: nobody scrolls to find out what the agents do, so the answer has to be beside the
 * first paragraph. It also replaces a separate "four agents" section that listed the same four
 * names this already showed.
 *
 * The animation is CSS only, declared in globals.css, and stops under prefers-reduced-motion.
 */

const STAGES = [
  { n: 1, name: "Triage", line: "How serious, and what kind of failure", cls: "stage-1", tint: "bg-sky-50 text-sky-700 ring-sky-600/20" },
  { n: 2, name: "Investigator", line: "Finds the file at fault, and how sure it is", cls: "stage-2", tint: "bg-violet-50 text-violet-700 ring-violet-600/20" },
  { n: 3, name: "Remediation", line: "Suggests a fix from a similar past incident", cls: "stage-3", tint: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  { n: 4, name: "Reporter", line: "Writes the summary for the team", cls: "stage-4", tint: "bg-amber-50 text-amber-700 ring-amber-600/20" },
];

export function Pipeline() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_18px_40px_-28px_rgba(28,25,23,0.3)] sm:p-6">
      <div className="flex items-center gap-3">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 ring-1 ring-red-600/20">
          <span className="pulse-ring absolute h-9 w-9 rounded-full bg-red-400/40" />
          <span className="relative h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Alert fires at 03:14</p>
          <p className="text-sm leading-snug text-ink-3">
            <span className="font-mono">checkout-service</span> · 98% of requests failing
          </p>
        </div>
      </div>

      <div className="my-3 ml-[17px] h-5 w-px bg-line-strong" />

      <ol className="space-y-3">
        {STAGES.map((stage, index) => (
          <li key={stage.name}>
            <div className={`flex gap-3 ${stage.cls}`}>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ring-1 ring-inset ${stage.tint}`}
              >
                {stage.n}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{stage.name}</p>
                <p className="mt-0.5 text-sm leading-snug text-ink-2">{stage.line}</p>
              </div>
            </div>

            {/* the branch, drawn where it happens */}
            {index === 1 && (
              <p className="my-2.5 ml-[17px] border-l border-dashed border-amber-400 py-0.5 pl-6 text-sm leading-snug text-ink-3">
                <span className="font-medium text-amber-700">Under 0.50 confidence</span>, it goes to
                a human instead.
              </p>
            )}
            {index !== 1 && index < STAGES.length - 1 && (
              <div className="my-2 ml-[17px] h-4 w-px bg-line-strong" />
            )}
          </li>
        ))}
      </ol>

      <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-emerald-50 p-3 ring-1 ring-inset ring-emerald-600/15">
        <svg viewBox="0 0 16 16" aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600">
          <path d="M3 8.4 6.3 11.7 13 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-sm leading-snug text-emerald-900">
          <span className="font-semibold">payment_processor.py</span>. Missing null check in{" "}
          <span className="font-semibold">build_billing_payload</span>, from a release two days
          ago.
        </p>
      </div>
    </div>
  );
}
