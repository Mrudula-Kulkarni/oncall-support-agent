import { Card, SectionLabel } from "./ui";

/**
 * Shown before a scenario is picked, where the result panel will later sit.
 *
 * It earns the space: the landing view is otherwise an empty column next to a list of alerts,
 * and someone arriving cold has no idea what four agents means or why there is a branch in the
 * middle. This says it in the shape of the thing itself.
 */

const STAGES = [
  {
    n: "1",
    name: "Triage",
    detail: "Decides how serious it is and what kind of failure it is, from the symptoms alone.",
    accent: "text-sky-300 ring-sky-500/30 bg-sky-500/10",
  },
  {
    n: "2",
    name: "Investigator",
    detail:
      "Reads the logs and recent deploys, narrows down which files could be at fault, then reads their code to find the actual cause — and says how confident it is.",
    accent: "text-violet-300 ring-violet-500/30 bg-violet-500/10",
  },
  {
    n: "3",
    name: "Remediation",
    detail:
      "Finds similar incidents the team has fixed before and suggests a fix based on what worked, saying which ones it used.",
    accent: "text-emerald-300 ring-emerald-500/30 bg-emerald-500/10",
  },
  {
    n: "4",
    name: "Reporter",
    detail: "Writes the short summary an on-call engineer would actually paste into Slack.",
    accent: "text-amber-300 ring-amber-400/30 bg-amber-400/10",
  },
];

export function PipelineIntro() {
  return (
    <div className="space-y-6">
      <Card className="p-7">
        <p className="text-center text-sm text-ink-dim">Pick an alert on the left to analyse it.</p>
        <p className="mx-auto mt-2 max-w-lg text-center text-xs leading-relaxed text-ink-faint">
          Each one takes roughly 10&ndash;40 seconds. You will see each agent report back as it
          finishes, rather than waiting for the whole thing.
        </p>
      </Card>

      <section>
        <SectionLabel>How it works</SectionLabel>
        <Card className="p-5">
          <ol className="space-y-4">
            {STAGES.map((stage, index) => (
              <li key={stage.name}>
                <div className="flex gap-3.5">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[11px] ring-1 ring-inset ${stage.accent}`}
                  >
                    {stage.n}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-semibold text-ink">{stage.name}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-faint">
                      {stage.detail}
                    </p>
                  </div>
                </div>

                {/* The §4.2 branch, drawn where it actually happens. */}
                {index === 1 && (
                  <div className="ml-3 mt-3 border-l border-dashed border-line pl-6">
                    <p className="text-xs leading-relaxed text-ink-faint">
                      <span className="font-medium text-amber-300">
                        If confidence is below 0.50
                      </span>{" "}
                      it stops and hands the incident to a human rather than suggesting a fix.
                      A confident-sounding suggestion built on weak evidence is worse than no
                      suggestion at all.
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ol>

          <div className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
            {[
              ["Repo search", "Direct file search, not a protocol layer — it would add a dependency without adding capability."],
              ["MCP tools", "Logs, deploys and runbooks sit behind an MCP server, because several agents share them."],
              ["Retrieval", "Chroma over 18 past incidents, embedded locally so a public demo costs nothing per click."],
            ].map(([title, body]) => (
              <div key={title}>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink-dim">
                  {title}
                </h4>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">{body}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
