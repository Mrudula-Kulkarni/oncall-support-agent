import type { Alert, StepEvent } from "./types";

/**
 * The FastAPI backend. Set NEXT_PUBLIC_API_URL for deployment — the backend is on Render and
 * this is on Vercel, which is why CORS is configured explicitly server-side (spec §7).
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export async function fetchScenarios(): Promise<Alert[]> {
  const response = await fetch(`${API_URL}/scenarios`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`GET /scenarios failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Runs one scenario and yields each agent's output as it completes.
 *
 * EventSource is not usable here: it only issues GET, and the run is a POST with a body. So
 * the SSE framing is parsed by hand off the fetch body stream. The format is the backend's
 * own: `event: <name>\ndata: <json>\n\n`.
 *
 * A full run takes tens of seconds, so streaming is the difference between watching progress
 * and watching a spinner.
 */
export async function* streamRun(
  alertId: string,
  signal?: AbortSignal,
): AsyncGenerator<StepEvent> {
  const response = await fetch(`${API_URL}/run/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alert_id: alertId }),
    signal,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      response.status === 404
        ? `No such scenario: ${alertId}`
        : `POST /run/stream failed: ${response.status} ${detail.slice(0, 200)}`,
    );
  }
  if (!response.body) {
    throw new Error("The server returned no stream body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Events are separated by a blank line. Anything after the last one is a partial event
    // still arriving, so it stays in the buffer.
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      let name = "message";
      const dataLines: string[] = [];
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) name = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      if (!dataLines.length) continue;

      const payload = JSON.parse(dataLines.join("\n"));
      if (name === "error") {
        throw new Error(payload.detail ?? "The pipeline failed upstream.");
      }
      if (name === "done") return;
      if (name === "step") yield payload as StepEvent;
    }
  }
}
