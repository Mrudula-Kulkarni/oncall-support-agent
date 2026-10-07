"use client";

import type { PipelineResult, StepName } from "@/lib/types";
import { ConfidenceMeter, Mono, SectionLabel } from "./ui";

/**
 * The live reasoning trail (spec §7): each agent's step and output, in order, as it lands.
 *
 * This is what the LangGraph streaming interface buys. A run takes tens of seconds, so without
 * it the user watches a spinner with no idea which agent is slow or whether anything is
 * happening at all.
 */

type StepState = "pending" | "running" | "done" | "skipped";

const STEPS: { node: StepName; title: string; blurb: string }[] = [
  { node: "triage", title: "Triage", blurb: "classify severity and category" },
  { node: "investigate", title: "Investigator", blurb: "locate the responsible code" },
  { node: "remediate", title: "Remediation", blurb: "propose a fix from past incidents" },
  { node: "report", title: "Reporter", blurb: "write the incident summary" },
];

function stateOf(
  node: StepName,
  completed: StepName[],
  running: boolean,
  escalated: boolean,
): StepState {
  if (node === "remediate" && escalated) return "skipped";
  if (completed.includes(node)) return "done";
  const order = STEPS.map((s) => s.node);
  const next = order.find(
    (n) => !completed.includes(n) && !(n === "remediate" && escalated),
  );
  return running && next === node ? "running" : "pending";
}

function Marker({ state }: { state: StepState }) {
  if (state === "running") {
    return (
      <span className="relative flex h-3 w-3 items-center justify-center" aria-label="running">
        <span className="absolute h-3 w-3 animate-ping rounded-full bg-sky-400/60" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_10px_2px_rgba(56,189,248,0.5)]" />
      </span>
    );
  }
  if (state === "done") {
    return (
      <span
        className="flex h-3 w-3 items-center justify-center rounded-full bg-emerald-400/15 ring-1 ring-emerald-400/50"
        aria-label="done"
      >
        <svg viewBox="0 0 10 10" className="h-2 w-2 text-emerald-300" aria-hidden>
          <path
            d="M1.5 5.2 3.8 7.5 8.5 2.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (state === "skipped") {
    return (
      <span
        className="h-3 w-3 rounded-full bg-amber-400/20 ring-1 ring-amber-400/50"
        aria-label="skipped"
      />
    );
  }
  return (
    <span className="h-3 w-3 rounded-full bg-white/[0.06] ring-1 ring-line" aria-label="pending" />
  );
}

export function ReasoningTrail({
  result,
  completed,
  running,
  showLocated = true,
}: {
  result: Partial<PipelineResult>;
  completed: StepName[];
  running: boolean;
  /** False once FinalPanel renders the same thing below, to avoid showing it twice. */
  showLocated?: boolean;
}) {
  const escalated = result.escalated_to_human === true;
  const doneCount = STEPS.filter(
    (s) => stateOf(s.node, completed, running, escalated) !== "pending",
  ).length;

  return (
    <div>
      <SectionLabel
        right={
          <span className="font-mono text-[11px] tabular-nums text-ink-faint">
            {result.duration_ms != null
              ? `${(result.duration_ms / 1000).toFixed(1)}s`
              : `${doneCount}/${STEPS.length}`}
          </span>
        }
      >
        Reasoning trail
      </SectionLabel>

      <ol>
        {STEPS.map((step, index) => {
          const state = stateOf(step.node, completed, running, escalated);
          const last = index === STEPS.length - 1;
          const dim = state === "pending";
          return (
            <li key={step.node} className="flex gap-3.5">
              <div className="flex flex-col items-center pt-1">
                <Marker state={state} />
                {!last && (
                  <div
                    className={`w-px flex-1 transition-colors duration-500 ${
                      state === "done" || state === "skipped"
                        ? "bg-emerald-400/25"
                        : "bg-line"
                    }`}
                  />
                )}
              </div>

              <div className={`min-w-0 flex-1 ${last ? "pb-0" : "pb-6"}`}>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <h3
                    className={`text-sm font-semibold ${dim ? "text-ink-faint" : "text-ink"}`}
                  >
                    {step.title}
                  </h3>
                  <span className="text-[11px] text-ink-faint">{step.blurb}</span>
                  {state === "skipped" && (
                    <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-300 ring-1 ring-inset ring-amber-400/25">
                      skipped — escalated
                    </span>
                  )}
                </div>

                <div className="mt-2 text-sm">
                  {step.node === "triage" && result.triage && (
                    <p className="rise text-ink-dim">{result.triage.short_reason}</p>
                  )}

                  {step.node === "investigate" && result.investigation && (
                    <div className="rise space-y-3">
                      <p className="text-ink-dim">{result.investigation.hypothesis}</p>
                      <ConfidenceMeter value={result.investigation.confidence} />
                      {result.investigation.evidence.length > 0 && (
                        <ul className="space-y-1.5">
                          {result.investigation.evidence.map((item, i) => (
                            <li
                              key={i}
                              className="rounded-md border-l-2 border-sky-500/30 bg-white/[0.02] py-1.5 pl-2.5 pr-2 font-mono text-[11px] leading-relaxed text-ink-faint"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {step.node === "remediate" && result.remediation && (
                    <p className="rise text-ink-dim">
                      Fix proposed, grounded in{" "}
                      <span className="text-emerald-300">
                        {result.remediation.referenced_incidents.length || "no"}
                      </span>{" "}
                      past incident
                      {result.remediation.referenced_incidents.length === 1 ? "" : "s"}.
                    </p>
                  )}

                  {step.node === "report" && result.report && (
                    <p className="rise text-ink-dim">Summary ready.</p>
                  )}

                  {dim && <p className="text-ink-faint/60">waiting</p>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {showLocated && result.investigation?.suspected_file && (
        <div className="rise mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <span className="text-[11px] uppercase tracking-wider text-ink-faint">located</span>
          <Mono tone="accent">{result.investigation.suspected_file}</Mono>
          {result.investigation.suspected_function && (
            <Mono tone="accent">{result.investigation.suspected_function}()</Mono>
          )}
        </div>
      )}
    </div>
  );
}
