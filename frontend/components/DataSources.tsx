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
    detail: "What fired: the service, what tripped, and the metric values behind it.",
    real: "Datadog, PagerDuty",
  },
  {
    label: "Logs",
    detail: "Log lines from around the time it broke, stack traces included, mixed in with everything else the service was doing.",
    real: "Splunk, Loki",
  },
  {
    label: "Deploys",
    detail: "Recent releases and the files each one changed. The one that caused it is not always the latest.",
    real: "ArgoCD, GitHub",
  },
  {
    label: "Source code",
    detail: "The service's own code, so a suspected cause can be checked by reading it rather than guessed from a stack trace.",
    real: "the monorepo",
  },
  {
    label: "Past incidents",
    detail: "Write ups from similar failures, naming the cause and the change that fixed it.",
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
        At a real company these sit in five separate systems and nothing joins them up, so no
        public dataset has all five for one incident.{" "}
        <span className="font-medium text-ink">This one does</span>, and since every bug in it was
        planted deliberately, the right answer is known before any agent runs. That is what makes
        the accuracy figures checkable rather than claimed.
      </p>
    </div>
  );
}
