"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Accuracy } from "@/components/Accuracy";
import { AlertDetail } from "@/components/AlertDetail";
import { FinalPanel } from "@/components/FinalPanel";
import { Nav } from "@/components/Nav";
import { ReasoningTrail } from "@/components/ReasoningTrail";
import { PipelineIntro } from "@/components/PipelineIntro";
import { ScenarioPicker } from "@/components/ScenarioPicker";
import { Card } from "@/components/ui";
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
      <Nav />


      <div className="mx-auto max-w-[88rem] px-5 py-7 sm:px-8">
        {loadError && (
          <Card tone="warn" className="mb-6 p-4">
            <p className="text-sm text-red-700">{loadError}</p>
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
            {!selected && !loadError && (
              <>
                <PipelineIntro />
                <Accuracy />
              </>
            )}

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
              <Card tone="warn" className="p-4">
                <h3 className="text-sm font-semibold text-red-700">The run failed</h3>
                <p className="mt-1.5 break-words text-sm leading-relaxed text-red-700/75">
                  {runError}
                </p>
                <p className="mt-2 text-sm text-red-700/50">
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

      </div>
    </div>
  );
}
