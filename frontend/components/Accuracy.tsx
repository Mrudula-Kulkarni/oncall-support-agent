import { Card, SectionLabel } from "./ui";

/**
 * How well it works.
 *
 * These numbers used to sit bare in the header — "12/12 found the right file", "+2 better than
 * a simple search" — which told a reader nothing. What is the right file? Better than what
 * search? A metric that needs explaining does not belong where there is no room to explain it,
 * so each now says what was measured and against what.
 */

const RESULTS = [
  {
    value: "12 of 12 alerts",
    headline: "The agent found the exact file with the bug",
    detail: "Each bug was planted on purpose, so the right answer is known in advance.",
    tone: "text-emerald-700",
  },
  {
    value: "12 vs 10",
    headline: "The agent vs a plain text search of the error",
    detail: "The search misses the two alerts whose errors name no file. The agent gets both.",
    tone: "text-brand",
  },
  {
    value: "12 of 12 fixes",
    headline: "Based on the right past incident",
    detail: "Each fix cites a past incident, and it is always the one that truly matches.",
    tone: "text-violet-700",
  },
];

export function Accuracy() {
  return (
    <section>
      <SectionLabel>How well does it actually work?</SectionLabel>
      <Card className="p-5">
        <div className="grid gap-5 sm:grid-cols-3">
          {RESULTS.map((r) => (
            <div key={r.headline}>
              <p className={`font-mono text-xl font-semibold tabular-nums ${r.tone}`}>
                {r.value}
              </p>
              <h3 className="mt-1 text-sm font-medium leading-snug text-ink">
                {r.headline}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-3">{r.detail}</p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
