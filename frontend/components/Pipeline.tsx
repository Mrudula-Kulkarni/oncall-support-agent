/**
 * The four agents, as the thing that happens to one alert.
 *
 * This replaces a separate "the four agents" section that listed the same four names the
 * animation already showed, so a reader met them twice and learned little either time. One
 * component now does both jobs: it animates the run and carries each agent's real description,
 * with the confidence branch drawn where it actually happens.
 *
 * The animation is CSS only, declared in globals.css, and stops entirely under
 * prefers-reduced-motion.
 */

const STAGES = [
  {
    n: 1,
    name: "Triage",
    line: "Works out how serious it is, and what kind of failure, from the symptoms alone.",
    cls: "stage-1",
    tint: "bg-sky-50 text-sky-700 ring-sky-600/20",
  },
  {
    n: 2,
    name: "Investigator",
    line: "Reads the logs, the recent deploys and the source code to name the file at fault, and says how sure it is.",
    cls: "stage-2",
    tint: "bg-violet-50 text-violet-700 ring-violet-600/20",
  },
  {
    n: 3,
    name: "Remediation",
    line: "Suggests a fix, and cites the past incident it learned from.",
    cls: "stage-3",
    tint: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  },
  {
    n: 4,
    name: "Reporter",
    line: "Writes the summary an on-call engineer would paste into Slack.",
    cls: "stage-4",
    tint: "bg-amber-50 text-amber-700 ring-amber-600/20",
  },
];

export function Pipeline() {
  return (
    <div>
      {/* the alert coming in */}
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-red-600/20">
          <span className="pulse-ring absolute h-9 w-9 rounded-full bg-red-400/40" />
          <span className="relative h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Alert fires at 03:14</p>
          <p className="text-sm text-ink-2">
            <span className="font-mono">checkout-service</span> · 98% of requests failing
          </p>
        </div>
      </div>

      {/* the four agents */}
      <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAGES.map((stage) => (
          <li
            key={stage.name}
            className={`rounded-xl border border-line bg-surface p-4 ${stage.cls}`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm font-semibold ring-1 ring-inset ${stage.tint}`}
              >
                {stage.n}
              </span>
              <h3 className="text-sm font-semibold text-ink">{stage.name}</h3>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-2">{stage.line}</p>
          </li>
        ))}
      </ol>

      {/* the branch, where it actually happens */}
      <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
        <p className="text-sm leading-relaxed text-ink-2">
          <span className="font-semibold text-ink">
            If the Investigator is under 50% sure
          </span>
          , the run stops after step 2 and hands the incident to a human instead of suggesting a
          fix. A suggestion that sounds certain but rests on thin evidence is worse than no
          suggestion, because people act on it.
        </p>
      </div>

      {/* what comes out */}
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <svg viewBox="0 0 16 16" aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600">
          <path
            d="M3 8.4 6.3 11.7 13 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-sm leading-relaxed text-ink-2">
          <span className="font-mono font-semibold text-ink">
            payment_processor.py
          </span>
          , in <span className="font-mono font-semibold text-ink">build_billing_payload</span>.
          A missing check on guest checkouts, introduced two days ago. Fix suggested from a
          matching incident the team resolved in February.
        </p>
      </div>
    </div>
  );
}
