"use client";

import Markdown from "react-markdown";
import type { PipelineResult } from "@/lib/types";
import { Card, Mono, SectionLabel } from "./ui";

/**
 * The final panel (spec §7): located file and function, the suggested fix, the past incidents
 * it was grounded in — or the needs-human-review state.
 *
 * Escalation is a first-class outcome, not an error. A low-confidence run is the pipeline
 * working correctly: spec §4.2 says a fix built on a hypothesis the system does not believe is
 * worse than no fix, because it reads as authoritative.
 */

/** Fenced blocks are styled apart from inline code — the model occasionally nests a fence in a
 * list item, which parses as one block per line, and `prose-pre` keeps that legible. */
const PROSE = [
  "prose prose-sm prose-invert max-w-none",
  "prose-p:my-2 prose-p:text-ink-dim prose-li:text-ink-dim",
  "prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
  "prose-strong:text-ink prose-headings:text-sm prose-headings:text-ink",
  "prose-a:text-sky-300",
  "prose-code:rounded prose-code:bg-sky-500/10 prose-code:px-1.5 prose-code:py-0.5",
  "prose-code:font-mono prose-code:text-[11px] prose-code:font-normal prose-code:text-sky-300",
  "prose-code:before:content-none prose-code:after:content-none",
  "prose-pre:my-3 prose-pre:rounded-lg prose-pre:border prose-pre:border-line",
  "prose-pre:bg-base prose-pre:p-3 prose-pre:text-[11px] prose-pre:leading-relaxed",
].join(" ");


export function FinalPanel({ result }: { result: PipelineResult }) {
  const { investigation, remediation, report, escalated_to_human } = result;

  return (
    <div className="rise space-y-5">
      {escalated_to_human && (
        <Card className="border-amber-500/30 bg-amber-500/[0.06] p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30">
              !
            </span>
            <div>
              <h3 className="text-sm font-semibold text-amber-200">Needs human review</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-amber-200/70">
                Confidence came back at{" "}
                <span className="font-mono">
                  {investigation?.confidence.toFixed(2) ?? "—"}
                </span>
                , below the 0.50 threshold, so no fix was proposed. A suggestion built on a
                hypothesis the pipeline does not believe would read as authoritative without
                being reliable.
              </p>
            </div>
          </div>
        </Card>
      )}

      {investigation?.suspected_file && (
        <section>
          <SectionLabel>Located</SectionLabel>
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Mono tone="accent">{investigation.suspected_file}</Mono>
              {investigation.suspected_function && (
                <Mono tone="accent">{investigation.suspected_function}()</Mono>
              )}
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-dim">
              {investigation.hypothesis}
            </p>
          </Card>
        </section>
      )}

      {remediation && (
        <section>
          <SectionLabel
            right={
              <span className="text-[11px] text-ink-faint">suggestion only — not executed</span>
            }
          >
            Suggested fix
          </SectionLabel>
          <Card className="p-4">
            <div className={PROSE}>
              <Markdown>{remediation.suggested_fix}</Markdown>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <span className="text-[11px] uppercase tracking-wider text-ink-faint">
                {remediation.referenced_incidents.length > 0
                  ? "grounded in"
                  : "not grounded in a retrieved incident"}
              </span>
              {remediation.referenced_incidents.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-300 ring-1 ring-inset ring-emerald-500/25"
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
          <SectionLabel>Incident summary</SectionLabel>
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
