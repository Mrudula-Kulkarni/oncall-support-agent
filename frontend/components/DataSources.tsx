/**
 * The five kinds of data a diagnosis needs, and where a real company keeps each one.
 *
 * Laid out as rows rather than five columns. Columns gave each description about two hundred
 * pixels, so every one wrapped to three ragged lines and the thing read as cramped. A row gets
 * the full width, which means the descriptions can carry some actual detail instead of being
 * squeezed to fit.
 *
 * Naming the real systems is the part that does the work: "five separate systems" is a claim,
 * while Datadog, Splunk, ArgoCD, the monorepo and Confluence is the evidence for it, and anyone
 * who has been on call recognises the problem straight away.
 */

const SOURCES = [
  {
    label: "The alert",
    detail: "The warning itself: which service, and the numbers that set it off.",
    real: "Datadog, PagerDuty",
  },
  {
    label: "Logs",
    detail: "What the service logged as it broke, error traces included.",
    real: "Splunk, Loki",
  },
  {
    label: "Deploys",
    detail: "Recent releases, and which files each one changed.",
    real: "ArgoCD, GitHub",
  },
  {
    label: "Source code",
    detail: "The service's own code, so a suspected cause can be checked rather than guessed.",
    real: "the monorepo",
  },
  {
    label: "Past incidents",
    detail: "Write ups of similar failures, and the change that fixed each one.",
    real: "Confluence, Notion",
  },
];

export function DataSources() {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <ul className="divide-y divide-line">
        {SOURCES.map((source, index) => (
          <li
            key={source.label}
            className="grid items-baseline gap-x-6 gap-y-1 px-5 py-4 sm:grid-cols-[13rem_1fr_11rem]"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-brand-soft font-mono text-[11px] font-semibold text-brand-deep">
                {index + 1}
              </span>
              <h3 className="text-sm font-semibold text-ink">{source.label}</h3>
            </div>

            <p className="text-sm leading-relaxed text-ink-2">{source.detail}</p>

            <p className="font-mono text-sm text-ink-3 sm:text-right">{source.real}</p>
          </li>
        ))}
      </ul>

      <p className="border-t border-line bg-canvas px-5 py-4 text-sm leading-relaxed text-ink-2">
        At a real company these sit in five different systems, so no public dataset has all five
        for one incident. <span className="font-medium text-ink">This one does</span>, and every
        bug in it was planted deliberately, so the right answer is known before any agent runs.
      </p>
    </div>
  );
}
