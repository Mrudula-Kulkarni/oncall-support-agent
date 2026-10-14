/**
 * The five things a diagnosis needs, drawn rather than described.
 *
 * This replaced two paragraphs making the same point in prose. The argument is structural —
 * five kinds of data that live in five different systems, joined here — so the shape carries it
 * better than a sentence listing them does.
 */

const SOURCES = [
  { label: "The alert", detail: "what fired, and the numbers with it", real: "Datadog, PagerDuty" },
  { label: "Logs", detail: "the minutes either side of it", real: "Splunk, Loki" },
  { label: "Deploys", detail: "what shipped, and when", real: "ArgoCD, GitHub" },
  { label: "Source code", detail: "the service's own files", real: "the monorepo" },
  { label: "Past incidents", detail: "write ups of what fixed it before", real: "Confluence, Jira" },
];

export function DataSources() {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 sm:p-6">
      <div className="grid gap-px overflow-hidden rounded-lg bg-line sm:grid-cols-5">
        {SOURCES.map((source, index) => (
          <div key={source.label} className="bg-surface p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-brand-soft font-mono text-[11px] font-semibold text-brand-deep">
                {index + 1}
              </span>
              <h3 className="text-sm font-semibold text-ink">{source.label}</h3>
            </div>
            <p className="mt-1.5 text-sm leading-snug text-ink-2">{source.detail}</p>
            <p className="mt-2 font-mono text-[11px] leading-snug text-ink-3">{source.real}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink-2">
        A real company holds those in five separate systems and nobody exports the join, so no
        public dataset has all five for the same incident.{" "}
        <span className="font-medium text-ink">
          This one does, and the right answer is known in advance.
        </span>{" "}
        That is what makes the results checkable rather than asserted.
      </p>
    </div>
  );
}
