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
    detail: "The warning that woke someone up. Which service, what went wrong, and the numbers behind it.",
    real: "Datadog, PagerDuty",
  },
  {
    label: "Logs",
    detail: "Everything the service wrote down around the time it broke. The error is in there, buried in thousands of ordinary lines.",
    real: "Splunk, Loki",
  },
  {
    label: "Deploys",
    detail: "A list of recent releases and the files each one changed. Often the cause is in the last one, but not always.",
    real: "ArgoCD, GitHub",
  },
  {
    label: "Source code",
    detail: "The actual code, so a hunch can be checked by reading it rather than guessing.",
    real: "the monorepo",
  },
  {
    label: "Past incidents",
    detail: "Notes from the last time something like this happened, and what fixed it then.",
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
        A real company holds those in five separate systems and nobody exports the join, so no
        public dataset has all five for the same incident.{" "}
        <span className="font-medium text-ink">This one does</span>, and because every bug in it
        was planted deliberately, the right answer is known before any agent runs. That is what
        makes the results checkable rather than asserted.
      </p>
    </div>
  );
}
