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
      "Twelve test incidents were written with a known answer — a specific file and function was broken on purpose. The agent named the right one every time.",
    tone: "text-emerald-700",
  },
  {
    value: "2 more",
    headline: "Than searching the error message alone",
    detail:
      "Most alerts quote a line of code in the error, so a plain text search finds the file in 10 of the 12 without any AI at all. The two it cannot find are the ones where the error names nothing — those need reading the code, and the agent got both.",
    tone: "text-brand",
  },
  {
    value: "12 of 12",
    headline: "Cited the right previous incident",
    detail:
      "Each suggested fix has to point at a past incident it learned from. Three candidates are offered each time; it picked the genuinely matching one every time, and never padded the list.",
    tone: "text-violet-700",
  },
];

export function Accuracy() {
  return (
    <section>
      <SectionLabel>How well does it actually work?</SectionLabel>
      <Card className="p-5">
        <p className="text-sm leading-relaxed text-ink-2">
          The twelve alerts on the left are not random samples — each was written around a bug
          deliberately planted in the sample codebase, so the correct answer is known in advance.
          That is what makes these numbers checkable rather than impressive-sounding.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-3">
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
          <span className="text-ink-2">The honest caveat:</span> the agents were tuned against
          these same twelve incidents, so this shows they handle these well — not that they would
          handle a thirteenth. A separate set the agents have never seen would be needed to claim
          that, and has not been built yet.
        </p>
      </Card>
    </section>
  );
}
