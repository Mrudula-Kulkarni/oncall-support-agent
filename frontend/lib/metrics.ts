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
          ? `${Math.round(now / base)}× slower than normal for the slowest 1% of requests`
          : undefined,
      severe: base !== undefined && now > base * 3,
    });
  }

  // --- everything else ------------------------------------------------------------------
  const SIMPLE: Record<string, (v: number | string) => ReadableMetric> = {
    memory_used_pct: (v) => ({
      label: "Memory used",
      value: `${num(v).toFixed(0)}%`,
      meaning: "Of the memory it is allowed. At 100% it gets killed and restarted",
      fill: num(v) / 100,
      severe: num(v) > 85,
    }),
    gc_pause_ms_p99: (v) => ({
      label: "Memory cleanup pauses",
      value: ms(num(v)),
      meaning: "Time the service spends reclaiming memory instead of serving requests",
      severe: num(v) > 300,
    }),
    minutes_since_deploy: (v) => ({
      label: "Time since deploy",
      value: `${num(v)} min later`,
      meaning: "A short gap points at the release rather than at extra traffic",
      severe: num(v) < 30,
    }),
    deploy_id: (v) => ({
      label: "Deploy",
      value: String(v),
    }),
    affected_requests_5m: (v) => ({
      label: "Affected requests",
      value: Number(v).toLocaleString(),
      meaning: "Requests affected in the last five minutes",
      severe: num(v) > 500,
    }),
    gateway_timeout_count_5m: (v) => ({
      label: "Card gateway timeouts",
      value: Number(v).toLocaleString(),
      meaning: "Calls to the card processor that timed out",
      severe: num(v) > 50,
    }),
    db_statement_timeout_count_5m: (v) => ({
      label: "Database queries cut off",
      value: Number(v).toLocaleString(),
      meaning: "Queries the database gave up on for taking too long",
      severe: num(v) > 50,
    }),
    restart_count_15m: (v) => ({
      label: "Restarts",
      value: String(v),
      meaning: "The service keeps crashing and being restarted",
      severe: num(v) > 3,
    }),
    healthy_pods: (v) => ({
      label: "Copies still running",
      value: String(v),
      meaning: num(v) === 0 ? "None, so the service is handling nothing at all" : "Of the number there should be",
      severe: num(v) === 0,
    }),
    expected_pods: (v) => ({
      label: "Copies there should be",
      value: String(v),
    }),
    refund_queue_depth: (v) => ({
      label: "Refunds waiting",
      value: Number(v).toLocaleString(),
      meaning: "Nothing is draining the queue, because no worker is healthy",
      severe: num(v) > 100,
    }),
    unauthorized_responses_5m: (v) => ({
      label: "Shoppers turned away",
      value: Number(v).toLocaleString(),
      meaning: "Rejected as not logged in, though many of them were",
      severe: num(v) > 100,
    }),
    oversell_events_1h: (v) => ({
      label: "Items oversold",
      value: Number(v).toLocaleString(),
      meaning: "Orders taken for stock that was not actually there",
      severe: num(v) > 10,
    }),
    stale_sku_count: (v) => ({
      label: "Products with the wrong stock level",
      value: Number(v).toLocaleString(),
      meaning: "Their recorded stock level has stopped being updated",
      severe: num(v) > 20,
    }),
    revenue_impact_usd_estimate: (v) => ({
      label: "Estimated revenue at risk",
      value: `$${Number(v).toLocaleString()}`,
      meaning: "Estimated value of the affected orders",
      severe: num(v) > 1000,
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
