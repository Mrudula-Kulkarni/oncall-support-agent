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
    value: "12 of 12",
    headline: "Named the exact file causing the bug",
    detail:
      "Each test bug was planted on purpose, so the right answer is known in advance.",
    tone: "text-emerald-700",
  },
  {
    value: "2 more",
    headline: "Than searching the error message alone",
    detail:
      "A plain text search finds 10 of 12. The agent also gets the two where the error names no file.",
    tone: "text-brand",
  },
  {
    value: "12 of 12",
    headline: "Cited the right previous incident",
    detail:
      "Every suggested fix points to the past incident that actually matches.",
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

        <p className="mt-5 border-t border-line pt-4 text-sm leading-relaxed text-ink-3">
          <span className="text-ink-2">Caveat:</span> the agents were tuned on these same twelve
          incidents, so this is not yet proof they generalise.
        </p>
      </Card>
    </section>
  );
}
