"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertDetail } from "@/components/AlertDetail";
import { FinalPanel } from "@/components/FinalPanel";
import { ReasoningTrail } from "@/components/ReasoningTrail";
import { PipelineIntro } from "@/components/PipelineIntro";
import { ScenarioPicker } from "@/components/ScenarioPicker";
import { Card } from "@/components/ui";
import { API_URL, fetchScenarios, streamRun } from "@/lib/api";
import type { Alert, PipelineResult, StepName } from "@/lib/types";

/** The measured results, from the three eval scripts. Shown because the honest framing — a
 * delta against a no-LLM floor — is more informative than a bare fraction. */
const METRICS = [
  { value: "12/12", label: "found the right file", note: "across 12 test alerts" },
  { value: "+2", label: "better than a simple search", note: "which gets 10 of 12" },
  { value: "12/12", label: "cited the right past case", note: "picked from 3 candidates" },
  { value: "4", label: "agents", note: "18 past incidents to learn from" },
];

export default function Dashboard() {
  const [scenarios, setScenarios] = useState<Alert[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<StepName[]>([]);
  const [result, setResult] = useState<Partial<PipelineResult>>({});
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchScenarios()
      .then(setScenarios)
      .catch((error: Error) =>
        setLoadError(
          `Could not reach the backend at ${API_URL}. Start it with ` +
            `\`cd backend && ./.venv/bin/python -m uvicorn app.main:app --reload\`. (${error.message})`,
        ),
      );
    return () => abortRef.current?.abort();
  }, []);

  /** Picking a scenario only shows it. Running is a deliberate second step — an exploratory
   * click should not spend three LLM calls, and the rate limit is tight. */
  const select = useCallback((alertId: string) => {
    abortRef.current?.abort();
    setSelected(alertId);
    setRunning(false);
    setRunError(null);
    setCompleted([]);
    setResult({});
  }, []);

  const run = useCallback(async (alertId: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSelected(alertId);
    setRunning(true);
    setRunError(null);
    setCompleted([]);
    setResult({});

    try {
      for await (const event of streamRun(alertId, controller.signal)) {
        // Each event carries only the fields its node produced, so merging builds up the
        // result. `remediation: null` from the escalate node is meaningful and must survive.
        setResult((previous) => ({ ...previous, ...event.data }));
        setCompleted((previous) =>
          previous.includes(event.step) ? previous : [...previous, event.step],
        );
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setRunError((error as Error).message);
      }
    } finally {
      setRunning(false);
    }
  }, []);

  const selectedAlert = scenarios.find((s) => s.alert_id === selected) ?? null;
  const started = running || completed.length > 0;
  const finished = !running && completed.includes("report");

  return (
    <div className="min-h-screen">
      {/* header */}
      <header className="grid-texture border-b border-line bg-surface/40">
        <div className="mx-auto max-w-[88rem] px-5 py-7 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 ring-1 ring-sky-500/30">
                  <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_10px_2px_rgba(56,189,248,0.6)]" />
                </span>
                <h1 className="text-[17px] font-semibold tracking-tight text-ink">
                  On-Call Support Agent
                </h1>
                <span className="rounded-md bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint ring-1 ring-inset ring-line">
                  demo
                </span>
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-ink-dim">
                Four agents take a production alert and return what broke, where in the code it
                originates, and a fix grounded in similar past incidents. Everything they see is
                controlled sample data, and the system only ever suggests —{" "}
                <span className="text-ink">nothing is executed</span>.
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-x-7 gap-y-3 sm:grid-cols-4">
              {METRICS.map((m) => (
                <div key={m.label}>
                  <dd className="font-mono text-lg font-semibold tabular-nums text-sky-300">
                    {m.value}
                  </dd>
                  <dt className="text-[11px] text-ink-dim">{m.label}</dt>
                  <dd className="text-[10px] text-ink-faint">{m.note}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[88rem] px-5 py-7 sm:px-8">
        {loadError && (
          <Card className="mb-6 border-rose-500/30 bg-rose-500/[0.06] p-4">
            <p className="text-[13px] text-rose-200">{loadError}</p>
          </Card>
        )}

        <div className="grid gap-7 lg:grid-cols-[21rem_1fr]">
          <aside className="lg:sticky lg:top-7 lg:max-h-[calc(100vh-3.5rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
            <ScenarioPicker
              scenarios={scenarios}
              selected={selected}
              running={running}
              onSelect={select}
            />
          </aside>

          <main className="min-w-0 space-y-6">
            {!selected && !loadError && <PipelineIntro />}

            {selectedAlert && (
              <AlertDetail
                alert={selectedAlert}
                triage={result.triage}
                running={running}
                hasRun={completed.length > 0}
                onRun={() => run(selectedAlert.alert_id)}
              />
            )}

            {runError && (
              <Card className="border-rose-500/30 bg-rose-500/[0.06] p-4">
                <h3 className="text-sm font-semibold text-rose-200">The run failed</h3>
                <p className="mt-1.5 break-words text-[13px] leading-relaxed text-rose-200/75">
                  {runError}
                </p>
                <p className="mt-2 text-[11px] text-rose-200/50">
                  Groq&apos;s free tier allows 8000 tokens a minute and one Investigator call can
                  request ~3400, so running scenarios back to back hits a 429. Waiting a moment
                  clears it.
                </p>
              </Card>
            )}

            {started && (
              <Card active={running} className="p-5">
                <ReasoningTrail
                  result={result}
                  completed={completed}
                  running={running}
                  showLocated={!finished}
                />
              </Card>
            )}

            {finished && result.alert && <FinalPanel result={result as PipelineResult} />}
          </main>
        </div>

        <footer className="mt-14 border-t border-line pt-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            How to read the numbers
          </h2>
          <p className="mt-2.5 max-w-4xl text-xs leading-relaxed text-ink-faint">
            Localization is measured against a labelled answer key of 12 scenarios: the agent
            locates the correct file in 12 of 12, against 10 of 12 for a no-LLM heuristic that
            takes the traceback nearest the alert. The two it gains are the two with no traceback
            naming the answer — an unbounded cache found by reading a declared-but-unenforced TTL,
            and an off-by-one found from <span className="font-mono">received=500 written=499</span>.
            Retrieval ties a keyword baseline at this corpus size, so the vector store is the right
            structure rather than a measurable win. Every prompt was tuned against these same 12
            scenarios with nothing held out, so each figure is a fit to the set rather than a
            generalisation estimate.
          </p>
        </footer>
      </div>
    </div>
  );
}
