/**
 * Turns raw metric keys into something a reader can act on.
 *
 * The alert fixtures carry machine values — `error_rate: 0.98`, `baseline_error_rate: 0.002`,
 * `p99_latency_ms: 4180` — and showing them as-is tells a reader nothing. 0.98 is not "bad",
 * it is "98 out of every 100 requests are failing, where normally it is 2 in a thousand". That
 * second reading is the whole point of the number.
 *
 * So each metric is paired with its baseline where one exists, formatted in human units, and
 * given a one-line meaning.
 */

export interface ReadableMetric {
  label: string;
  value: string;
  /** The normal value, when the fixture carries a baseline to compare against. */
  baseline?: string;
  /** What the number means in plain words. */
  meaning?: string;
  /** 0–1, for a bar. Only when a proportion is genuinely meaningful. */
  fill?: number;
  severe?: boolean;
}

const pct = (n: number) => `${(n * 100).toFixed(n < 0.01 ? 2 : 0)}%`;
const ms = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n)}ms`);
const num = (v: unknown) => (typeof v === "number" ? v : Number(v));

export function readableMetrics(metric: Record<string, string | number>): ReadableMetric[] {
  const out: ReadableMetric[] = [];
  const seen = new Set<string>();
  const take = (key: string) => {
    seen.add(key);
    return metric[key];
  };

  // --- error rate, against its baseline -------------------------------------------------
  if ("error_rate" in metric) {
    const rate = num(take("error_rate"));
    const base = "baseline_error_rate" in metric ? num(take("baseline_error_rate")) : undefined;
    out.push({
      label: "Requests failing",
      value: pct(rate),
      baseline: base !== undefined ? `normally ${pct(base)}` : undefined,
      meaning:
        base !== undefined && base > 0
          ? `About ${Math.round(rate / base)}× the normal failure rate`
          : undefined,
      fill: rate,
      severe: rate > 0.1,
    });
  }

  // --- latency, against its baseline ----------------------------------------------------
  if ("p99_latency_ms" in metric) {
    const now = num(take("p99_latency_ms"));
    const base =
      "baseline_p99_latency_ms" in metric ? num(take("baseline_p99_latency_ms")) : undefined;
    out.push({
      label: "Slowest requests",
      value: ms(now),
      baseline: base !== undefined ? `normally ${ms(base)}` : undefined,
      meaning:
        base !== undefined && base > 0
          ? `${Math.round(now / base)}× slower than usual for the worst 1% of requests`
          : undefined,
      severe: base !== undefined && now > base * 3,
    });
  }

  // --- everything else ------------------------------------------------------------------
  const SIMPLE: Record<string, (v: number | string) => ReadableMetric> = {
    memory_used_pct: (v) => ({
      label: "Memory used",
      value: `${num(v).toFixed(0)}%`,
      meaning: "Of the container's limit — it is killed when this reaches 100%",
      fill: num(v) / 100,
      severe: num(v) > 85,
    }),
    gc_pause_ms_p99: (v) => ({
      label: "Garbage-collection pauses",
      value: ms(num(v)),
      meaning: "Time the service spends frozen reclaiming memory, instead of serving",
      severe: num(v) > 300,
    }),
    minutes_since_deploy: (v) => ({
      label: "Started after a deploy",
      value: `${num(v)} min later`,
      meaning: "Short gaps point at the release rather than at load",
      severe: num(v) < 30,
    }),
    deploy_id: (v) => ({
      label: "The release in question",
      value: String(v),
    }),
    affected_requests_5m: (v) => ({
      label: "Customers hit",
      value: Number(v).toLocaleString(),
      meaning: "Requests affected in the last five minutes",
      severe: num(v) > 500,
    }),
    gateway_timeout_count_5m: (v) => ({
      label: "Card gateway timeouts",
      value: Number(v).toLocaleString(),
      meaning: "Calls to the card processor that never answered, in five minutes",
      severe: num(v) > 50,
    }),
    db_statement_timeout_count_5m: (v) => ({
      label: "Database queries cut off",
      value: Number(v).toLocaleString(),
      meaning: "Queries the database abandoned for taking too long, in five minutes",
      severe: num(v) > 50,
    }),
    restart_count: (v) => ({
      label: "Restarts",
      value: String(v),
      meaning: "The service keeps crashing and being restarted",
      severe: num(v) > 3,
    }),
    queue_depth: (v) => ({
      label: "Jobs backed up",
      value: Number(v).toLocaleString(),
      meaning: "Waiting work that nothing is processing",
      severe: num(v) > 100,
    }),
  };

  for (const [key, value] of Object.entries(metric)) {
    if (seen.has(key)) continue;
    const build = SIMPLE[key];
    out.push(
      build
        ? build(value)
        : { label: key.replace(/_/g, " "), value: String(value) },
    );
  }

  return out;
}
