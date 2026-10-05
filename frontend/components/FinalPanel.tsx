"use client";

import Markdown from "react-markdown";
import type { PipelineResult } from "@/lib/types";
import { Card, SectionLabel, SeverityBadge, Tag } from "./ui";

/**
 * The final panel (spec §7): located file and function, the suggested fix, the past incidents
 * it was grounded in — or the needs-human-review state.
 *
 * Escalation is rendered as a first-class outcome, not an error. A low-confidence run is the
 * pipeline working correctly: spec §4.2 says a fix built on a hypothesis the system does not
 * believe is worse than no fix, because it reads as authoritative.
 */

/** Tailwind Typography, with fenced blocks styled apart from inline code. The model sometimes
 * nests a fence inside a list item, which parses as one block per line; `prose-pre` keeps those
 * legible even when it does, and the Remediation prompt asks for top-level fences. */
const PROSE = [
  "prose prose-sm max-w-none prose-slate dark:prose-invert",
  "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:text-sm",
  // inline code
  "prose-code:rounded prose-code:bg-slate-500/10 prose-code:px-1 prose-code:py-0.5",
  "prose-code:font-mono prose-code:text-xs prose-code:font-normal",
  "prose-code:before:content-none prose-code:after:content-none",
  // fenced blocks
  "prose-pre:my-2 prose-pre:rounded-lg prose-pre:bg-slate-900 prose-pre:p-3",
  "prose-pre:text-xs prose-pre:leading-relaxed prose-pre:overflow-x-auto",
  "dark:prose-pre:bg-slate-950 dark:prose-pre:ring-1 dark:prose-pre:ring-slate-800",
].join(" ");

export function FinalPanel({ result }: { result: PipelineResult }) {
  const { investigation, remediation, report, escalated_to_human } = result;

  return (
    <div className="space-y-4">
      {escalated_to_human && (
        <Card className="border-amber-500/40 bg-amber-500/10 p-4">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Needs human review
          </h3>
          <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200/80">
            The investigation returned a confidence of{" "}
            <span className="font-mono">
              {investigation?.confidence.toFixed(2) ?? "—"}
            </span>
            , below the 0.50 threshold, so no fix was proposed. A suggestion built on a
            hypothesis the pipeline does not believe would read as authoritative without
            being reliable.
          </p>
        </Card>
      )}

      {investigation?.suspected_file && (
        <section className="space-y-2">
          <SectionLabel>Located</SectionLabel>
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Tag>{investigation.suspected_file}</Tag>
              {investigation.suspected_function && (
                <Tag>{investigation.suspected_function}()</Tag>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              {investigation.hypothesis}
            </p>
          </Card>
        </section>
      )}

      {remediation && (
        <section className="space-y-2">
          <SectionLabel>Suggested fix</SectionLabel>
          <Card className="p-4">
            <div className={PROSE}>
              <Markdown>{remediation.suggested_fix}</Markdown>
            </div>
            <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
              <p className="text-xs font-medium text-slate-500">
                {remediation.referenced_incidents.length > 0
                  ? "Grounded in past incidents"
                  : "Not grounded in a retrieved past incident"}
              </p>
              {remediation.referenced_incidents.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {remediation.referenced_incidents.map((id) => (
                    <Tag key={id}>{id}</Tag>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Suggestion only — nothing here is executed.
            </p>
          </Card>
        </section>
      )}

      {report && (
        <section className="space-y-2">
          <SectionLabel>Incident summary</SectionLabel>
          <Card className="p-4">
            <div className={PROSE}>
              <Markdown>{report.summary_markdown}</Markdown>
            </div>
          </Card>
        </section>
      )}

      {result.triage && (
        <section className="space-y-2">
          <SectionLabel>Alert</SectionLabel>
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={result.triage.severity} />
              <Tag>{result.triage.category}</Tag>
              <Tag>{result.alert.service_id}</Tag>
            </div>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              {result.alert.message}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              {Object.entries(result.alert.metric).map(([key, value]) => (
                <div key={key} className="min-w-0">
                  <dt className="truncate text-xs text-slate-500">{key}</dt>
                  <dd className="font-mono text-sm text-slate-700 dark:text-slate-300">
                    {String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </section>
      )}
    </div>
  );
}
