"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FinalPanel } from "@/components/FinalPanel";
import { ReasoningTrail } from "@/components/ReasoningTrail";
import { ScenarioPicker } from "@/components/ScenarioPicker";
import { Card, SectionLabel } from "@/components/ui";
import { API_URL, fetchScenarios, streamRun } from "@/lib/api";
import type { Alert, PipelineResult, StepName } from "@/lib/types";

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
        // Each event carries only the fields its node produced, so merging is what builds up
        // the result. `remediation: null` from the escalate node is meaningful and must survive.
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

  const finished = !running && completed.includes("report");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            On-Call Support Agent
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            Four agents take a production alert and return what broke, where in the code it
            originates, and a fix grounded in similar past incidents. Everything it sees is
            controlled sample data, and it only ever suggests — nothing is executed.
          </p>
        </header>

        {loadError && (
          <Card className="mb-6 border-red-500/40 bg-red-500/10 p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{loadError}</p>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <ScenarioPicker
              scenarios={scenarios}
              selected={selected}
              running={running}
              onSelect={run}
            />
          </aside>

          <main className="min-w-0 space-y-8">
            {!selected && !loadError && (
              <Card className="p-8 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Pick a scenario to run the pipeline.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Each run makes three to four LLM calls and takes roughly 10–40 seconds. The
                  trail fills in as each agent finishes.
                </p>
              </Card>
            )}

            {runError && (
              <Card className="border-red-500/40 bg-red-500/10 p-4">
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">
                  The run failed
                </h3>
                <p className="mt-1 text-sm text-red-900/80 dark:text-red-200/80">
                  {runError}
                </p>
                <p className="mt-2 text-xs text-red-900/70 dark:text-red-200/70">
                  Groq&apos;s free tier rate-limits bursts of requests; waiting a moment and
                  re-running usually clears it.
                </p>
              </Card>
            )}

            {selected && (
              <Card className="p-5">
                <ReasoningTrail
                  result={result}
                  completed={completed}
                  running={running}
                />
              </Card>
            )}

            {finished && result.alert && (
              <FinalPanel result={result as PipelineResult} />
            )}
          </main>
        </div>

        <footer className="mt-12 border-t border-slate-200 pt-6 dark:border-slate-800">
          <SectionLabel>How to read this</SectionLabel>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-500">
            Localization is measured against a labelled answer key of 12 scenarios: the agent
            locates the correct file in 12 of 12, against 10 of 12 for a no-LLM heuristic that
            just takes the traceback nearest the alert. The two it gains are the two with no
            traceback naming the answer. Retrieval ties a keyword baseline at this corpus size —
            18 incidents, written in the alerts&apos; own vocabulary — so the vector store is the
            right structure rather than a measurable win.
          </p>
        </footer>
      </div>
    </div>
  );
}
