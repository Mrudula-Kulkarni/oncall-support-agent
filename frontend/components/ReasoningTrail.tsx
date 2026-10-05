"use client";

import type { PipelineResult, StepName } from "@/lib/types";
import { ConfidenceMeter, SectionLabel, Tag } from "./ui";

/**
 * The live reasoning trail (spec §7): each agent's step and output, in order, as it lands.
 *
 * This is what the LangGraph streaming interface is for. A full run takes tens of seconds, so
 * without this the user stares at a spinner and has no idea whether anything is happening or
 * which agent is slow.
 */

type StepState = "pending" | "running" | "done" | "skipped";

interface StepSpec {
  node: StepName;
  title: string;
  /** What this agent does, for someone seeing the pipeline for the first time. */
  blurb: string;
}

const STEPS: StepSpec[] = [
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
  // The next step to run is the first incomplete one, so the spinner lands on it.
  const order = STEPS.map((s) => s.node);
  const nextIndex = order.findIndex((n) => !completed.includes(n) && !(n === "remediate" && escalated));
  return running && order[nextIndex] === node ? "running" : "pending";
}

function Marker({ state }: { state: StepState }) {
  if (state === "running") {
    return (
      <span className="relative flex h-2.5 w-2.5" aria-label="running">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
      </span>
    );
  }
  const styles: Record<Exclude<StepState, "running">, string> = {
    done: "bg-emerald-500",
    skipped: "bg-amber-500",
    pending: "bg-slate-300 dark:bg-slate-700",
  };
  return (
    <span
      className={`h-2.5 w-2.5 rounded-full ${styles[state]}`}
      aria-label={state}
    />
  );
}

export function ReasoningTrail({
  result,
  completed,
  running,
}: {
  result: Partial<PipelineResult>;
  completed: StepName[];
  running: boolean;
}) {
  const escalated = result.escalated_to_human === true;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <SectionLabel>Reasoning trail</SectionLabel>
        {result.duration_ms != null && (
          <span className="font-mono text-xs text-slate-500">
            {(result.duration_ms / 1000).toFixed(1)}s end to end
          </span>
        )}
      </div>

      <ol className="space-y-0">
        {STEPS.map((step, index) => {
          const state = stateOf(step.node, completed, running, escalated);
          const last = index === STEPS.length - 1;
          return (
            <li key={step.node} className="flex gap-3">
              {/* rail */}
              <div className="flex flex-col items-center pt-1.5">
                <Marker state={state} />
                {!last && (
                  <div
                    className={`w-px flex-1 ${state === "done" ? "bg-emerald-500/30" : "bg-slate-200 dark:bg-slate-800"}`}
                  />
                )}
              </div>

              <div className={`min-w-0 flex-1 ${last ? "pb-0" : "pb-5"}`}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3
                    className={`text-sm font-semibold ${
                      state === "pending"
                        ? "text-slate-400 dark:text-slate-600"
                        : "text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {step.title}
                  </h3>
                  <span className="text-xs text-slate-500">{step.blurb}</span>
                  {state === "skipped" && (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      skipped — escalated to a human
                    </span>
                  )}
                </div>

                <div className="mt-1.5 text-sm">
                  {step.node === "triage" && result.triage && (
                    <p className="text-slate-700 dark:text-slate-300">
                      {result.triage.short_reason}
                    </p>
                  )}

                  {step.node === "investigate" && result.investigation && (
                    <div className="space-y-2">
                      <p className="text-slate-700 dark:text-slate-300">
                        {result.investigation.hypothesis}
                      </p>
                      <ConfidenceMeter value={result.investigation.confidence} />
                      {result.investigation.evidence.length > 0 && (
                        <ul className="space-y-1">
                          {result.investigation.evidence.map((item, i) => (
                            <li
                              key={i}
                              className="border-l-2 border-slate-200 pl-2 font-mono text-xs text-slate-500 dark:border-slate-800"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {step.node === "remediate" && result.remediation && (
                    <p className="text-slate-600 dark:text-slate-400">
                      Proposed a fix grounded in{" "}
                      {result.remediation.referenced_incidents.length || "no"} past
                      incident
                      {result.remediation.referenced_incidents.length === 1 ? "" : "s"}.
                    </p>
                  )}

                  {step.node === "report" && result.report && (
                    <p className="text-slate-600 dark:text-slate-400">
                      Summary ready.
                    </p>
                  )}

                  {state === "pending" && (
                    <p className="text-slate-400 dark:text-slate-600">waiting</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {result.investigation?.suspected_file && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Tag>{result.investigation.suspected_file}</Tag>
          {result.investigation.suspected_function && (
            <Tag>{result.investigation.suspected_function}()</Tag>
          )}
        </div>
      )}
    </div>
  );
}
