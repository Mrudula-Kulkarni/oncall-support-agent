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
    detail: "The firing alert: service, condition, and the metric values that crossed the threshold.",
    real: "Datadog, PagerDuty",
  },
  {
    label: "Logs",
    detail: "Log lines around the incident window, stack traces included, interleaved with unrelated traffic from the same service.",
    real: "Splunk, Loki",
  },
  {
    label: "Deploys",
    detail: "Recent releases with their timestamps and changed files. The introducing deploy is not always the most recent one.",
    real: "ArgoCD, GitHub",
  },
  {
    label: "Source code",
    detail: "The service's files, so a hypothesis can be confirmed against the implementation rather than inferred from a trace.",
    real: "the monorepo",
  },
  {
    label: "Past incidents",
    detail: "Postmortems naming a prior root cause and the change that resolved it.",
    real: "Confluence, Jira",
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
        These live in five separate systems at a real company and nothing exports the join, so no
        public dataset carries all five for the same incident.{" "}
        <span className="font-medium text-ink">This corpus does</span>, and because every bug in
        it was planted deliberately, the ground truth is known before any agent runs. That is
        what makes the localization accuracy measurable rather than asserted.
      </p>
    </div>
  );
}
