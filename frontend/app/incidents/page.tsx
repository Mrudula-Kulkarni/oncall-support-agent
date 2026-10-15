"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AlertDetail } from "@/components/AlertDetail";
import { FinalPanel } from "@/components/FinalPanel";
import { Nav } from "@/components/Nav";
import { ReasoningTrail } from "@/components/ReasoningTrail";
import { IncidentTable } from "@/components/IncidentTable";
import { ScenarioPicker } from "@/components/ScenarioPicker";
import { ArrowRight, Card } from "@/components/ui";
import { API_URL, fetchScenarios, streamRun } from "@/lib/api";
import type { Alert, PipelineResult, StepName } from "@/lib/types";

function Dashboard() {
  // ?alert=alrt_003 — lets the landing page link straight to one incident, so "see it work"
  // can be a real example rather than a generic button.
  const requested = useSearchParams().get("alert");
  const router = useRouter();
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
      .then((loaded) => {
        setScenarios(loaded);
        if (requested && loaded.some((a) => a.alert_id === requested)) {
          setSelected(requested);
        }
      })
      .catch((error: Error) =>
        setLoadError(
          `Could not reach the backend at ${API_URL}. Start it with ` +
            `\`cd backend && ./.venv/bin/python -m uvicorn app.main:app --reload\`. (${error.message})`,
        ),
      );
    return () => abortRef.current?.abort();
  }, [requested]);

  /** Picking a scenario only shows it. Running is a deliberate second step — an exploratory
   * click should not spend three LLM calls, and the rate limit is tight. */
  const select = useCallback((alertId: string) => {
    abortRef.current?.abort();
    setSelected(alertId);
    window.scrollTo({ top: 0 });
    setRunning(false);
    setRunError(null);
    setCompleted([]);
    setResult({});
  }, []);

  /** Back to the grid. Drops ?alert= too, or a refresh would reopen the same incident. */
  const back = useCallback(() => {
    abortRef.current?.abort();
    setSelected(null);
    setRunning(false);
    setRunError(null);
    setCompleted([]);
    setResult({});
    if (requested) router.replace("/incidents");
  }, [requested, router]);

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

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        {loadError && (
          <Card tone="warn" className="mb-6 p-4">
            <p className="text-sm text-red-700">{loadError}</p>
          </Card>
        )}

        {!selected && !loadError && (
          <IncidentTable scenarios={scenarios} onSelect={select} />
        )}

        {selected && (
          <div className="grid gap-7 lg:grid-cols-[19rem_1fr]">
            <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
              <button
                onClick={back}
                disabled={running}
                className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-3 transition-colors hover:text-ink disabled:opacity-40"
              >
                <span className="rotate-180">
                  <ArrowRight />
                </span>
                All incidents
              </button>
              <ScenarioPicker
                scenarios={scenarios}
                selected={selected}
                running={running}
                onSelect={select}
              />
            </aside>

            <main className="min-w-0 space-y-6">
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
                  <h3 className="text-sm font-semibold text-red-700">
                    The run failed
                  </h3>
                  <p className="mt-1.5 break-words text-sm leading-relaxed text-red-700/75">
                    {runError}
                  </p>
                  <p className="mt-2 text-sm text-red-700/50">
                    Groq&apos;s free tier allows 8000 tokens a minute and one
                    Investigator call can request ~3400, so running scenarios
                    back to back hits a 429. Waiting a moment clears it.
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

              {finished && result.alert && (
                <FinalPanel result={result as PipelineResult} />
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

export default function IncidentsPage() {
  return (
    <Suspense fallback={null}>
      <Dashboard />
    </Suspense>
  );
}
