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
    detail: "The warning itself: which service, and the numbers that set it off, like the share of requests failing. Triage reads it to decide how serious the problem is and what kind of failure it looks like.",
    real: "Datadog, PagerDuty",
  },
  {
    label: "Logs",
    detail: "What the service logged in the minutes before and after it broke, including any error messages. These usually point at where the failure started, and sometimes name the file directly.",
    real: "Splunk, Loki",
  },
  {
    label: "Deploys",
    detail: "The service's recent releases, when each went out, and which files it changed. A failure that starts right after a release often points to something that release touched.",
    real: "ArgoCD, GitHub",
  },
  {
    label: "Source code",
    detail: "The service's own code. The Investigator searches it to confirm the file and function it suspects really exist, so the answer is checked rather than guessed.",
    real: "the monorepo",
  },
  {
    label: "Past incidents",
    detail: "Write ups of earlier failures, what caused each one, and the change that fixed it. Remediation searches them for a close match and bases its suggested fix on what worked before.",
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
