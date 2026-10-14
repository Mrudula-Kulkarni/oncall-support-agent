"use client";

import Markdown from "react-markdown";
import type { PipelineResult } from "@/lib/types";
import { Card, Mono, SectionLabel } from "./ui";

/**
 * The final panel (spec §7): located file and function, the suggested fix, the past incidents
 * the past incidents it drew on — or the needs-human-review state.
 *
 * Escalation is a first-class outcome, not an error. A low-confidence run is the pipeline
 * working correctly: spec §4.2 says a fix built on a hypothesis the system does not believe is
 * worse than no fix, because it reads as authoritative.
 */

/** Fenced blocks are styled apart from inline code — the model occasionally nests a fence in a
 * list item, which parses as one block per line, and `prose-pre` keeps that legible. */
const PROSE = [
  "prose prose-sm prose-stone max-w-none",
  "prose-p:my-2 prose-p:text-ink-2 prose-li:text-ink-2",
  "prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
  "prose-strong:text-ink prose-headings:text-sm prose-headings:text-ink",
  "prose-a:text-brand",
  "prose-code:rounded prose-code:bg-brand-soft prose-code:px-1.5 prose-code:py-0.5",
  "prose-code:font-mono prose-code:text-sm prose-code:font-normal prose-code:text-brand",
  "prose-code:before:content-none prose-code:after:content-none",
  "prose-pre:my-3 prose-pre:rounded-lg prose-pre:border prose-pre:border-line",
  "prose-pre:bg-canvas prose-pre:p-3 prose-pre:text-sm prose-pre:leading-relaxed",
].join(" ");


export function FinalPanel({ result }: { result: PipelineResult }) {
  const { investigation, remediation, report, escalated_to_human } = result;

  return (
    <div className="rise space-y-5">
      {escalated_to_human && (
        <Card tone="note" className="p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-600/25">
              !
            </span>
            <div>
              <h3 className="text-sm font-semibold text-amber-800">Needs human review</h3>
              <p className="mt-1 text-sm leading-relaxed text-amber-800/70">
                The agents were only{" "}
                <span className="font-mono">
                  {investigation?.confidence.toFixed(2) ?? "—"}
                </span>
                 sure, which is below the 0.50 cut off, so no fix was suggested. A suggestion built on a
                hypothesis the pipeline does not believe would read as authoritative without
                being reliable.
              </p>
            </div>
          </div>
        </Card>
      )}

      {investigation?.suspected_file && (
        <section>
          <SectionLabel>Where it comes from</SectionLabel>
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Mono tone="brand">{investigation.suspected_file}</Mono>
              {investigation.suspected_function && (
                <Mono tone="brand">{investigation.suspected_function}()</Mono>
              )}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">
              {investigation.hypothesis}
            </p>
          </Card>
        </section>
      )}

      {remediation && (
        <section>
          <SectionLabel
            right={
              <span className="text-sm text-ink-3">a suggestion, nothing is run</span>
            }
          >
            Suggested fix
          </SectionLabel>
          <Card className="p-4">
            <div className={PROSE}>
              <Markdown>{remediation.suggested_fix}</Markdown>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <span className="text-sm uppercase tracking-wider text-ink-3">
                {remediation.referenced_incidents.length > 0
                  ? "based on past incident"
                  : "no similar past incident was found"}
              </span>
              {remediation.referenced_incidents.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-sm text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                >
                  {id}
                </span>
              ))}
            </div>
          </Card>
        </section>
      )}

      {report && (
        <section>
          <SectionLabel>Summary for the team</SectionLabel>
          <Card className="p-4">
            <div className={PROSE}>
              <Markdown>{report.summary_markdown}</Markdown>
            </div>
          </Card>
        </section>
      )}

    </div>
  );
}
