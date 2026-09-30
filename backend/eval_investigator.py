"""Scores the Investigator on root-cause localization — the one metric spec §8 calls defensible.

Reports against the no-LLM floor from baseline.py rather than on its own. Most alerts carry a
stack trace naming the failing file, so a bare "located the file in N/12" overstates what the
agent contributes; the delta is the honest figure.

`alrt_003` and `alrt_009` are the two scenarios the floor misses, because their logs contain no
traceback naming the answer. They are where the agent either reasons or doesn't, so they are
called out separately.

    python3.13 eval_investigator.py [-v]
"""

import json
import pathlib
import sys
import time

from app.agents.investigator import run_investigator
from app.agents.triage import run_triage
from app.data_access import load_alert
from app.llm import model_name
from app.pipeline import CONFIDENCE_THRESHOLD
from baseline import guess as baseline_guess

DATA = pathlib.Path(__file__).resolve().parent / "data"

# Groq's free tier rate-limits a 24-call run. Retry with backoff so a 429 does not masquerade
# as a wrong answer, and pace the loop so the run is reproducible rather than luck.
RETRIES = 4
BACKOFF_SECONDS = 20
PACE_SECONDS = 2


def _with_retry(alert):
    """Triage + investigate, retrying transient upstream failures."""
    last = None
    for attempt in range(RETRIES):
        try:
            triage = run_triage(alert)
            return triage, run_investigator(alert, triage)
        except Exception as exc:  # RateLimitError, APITimeoutError, transient 5xx
            last = exc
            if "rate" not in type(exc).__name__.lower() and "timeout" not in str(exc).lower():
                raise
            if attempt < RETRIES - 1:
                wait = BACKOFF_SECONDS * (attempt + 1)
                print(f"    rate limited, waiting {wait}s (attempt {attempt + 2}/{RETRIES})")
                time.sleep(wait)
    raise last


def main():
    verbose = "-v" in sys.argv
    scenarios = json.loads((DATA / "eval" / "labeled_test_set.json").read_text())["scenarios"]

    file_hits = func_hits = base_hits = 0
    escalated = 0
    latencies = []
    rows = []
    errors = []

    print(f"model: {model_name()}\nscoring {len(scenarios)} scenarios...\n")

    for s in scenarios:
        alert = load_alert(s["alert_id"])
        expected = s["expected_file"].replace("sample_repo/", "")

        bg = baseline_guess(s["service_id"], alert.timestamp)
        base_ok = bg is not None and bg[0] == expected
        base_hits += base_ok

        started = time.perf_counter()
        try:
            triage, out = _with_retry(alert)
        except Exception as exc:
            # Counted apart from wrong answers. A rate limit is not a localization failure,
            # and folding it into the score silently understates the agent — an earlier run
            # reported 9/12 when two of the three "misses" were RateLimitError.
            errors.append((s["alert_id"], type(exc).__name__))
            rows.append((s["alert_id"], None, None, base_ok,
                         f"ERROR {type(exc).__name__}", "-", 0.0, 0))
            continue
        elapsed = int((time.perf_counter() - started) * 1000)
        latencies.append(elapsed)

        got_file = (out.suspected_file or "").replace("sample_repo/", "")
        ok_file = got_file == expected
        ok_func = ok_file and out.suspected_function in s["acceptable_functions"]
        file_hits += ok_file
        func_hits += ok_func
        escalated += out.confidence < CONFIDENCE_THRESHOLD
        rows.append((s["alert_id"], ok_file, ok_func, base_ok, got_file,
                     out.suspected_function, out.confidence, elapsed))
        time.sleep(PACE_SECONDS)

        if verbose:
            print(f"  {s['alert_id']} conf={out.confidence:.2f}  {out.hypothesis[:150]}")
            for ev in out.evidence:
                print(f"      - {ev[:140]}")
            print()

    n = len(scenarios)
    print(f"{'alert':9} {'agent':6} {'floor':6} {'file':46} {'function':28} conf   ms")
    print("-" * 112)
    for aid, ok_f, ok_fn, base_ok, got, fn, conf, ms in rows:
        mark = "ERR " if ok_f is None else ("hit " if ok_f else "MISS")
        star = " " if ok_f is None or ok_f == base_ok else ("+" if ok_f else "-")
        fnmark = fn if ok_fn or not ok_f else f"{fn} (not acceptable)"
        print(f"{aid:9} {mark:6} {'hit ' if base_ok else 'MISS':6} "
              f"{got[:46]:46} {str(fnmark)[:28]:28} {conf:.2f} {ms:>5}{star}")

    scored = n - len(errors)
    if errors:
        print(f"\n{len(errors)} scenario(s) failed upstream and are NOT scored:")
        for aid, kind in errors:
            print(f"  {aid}  {kind}")
    print(f"\nscored                     {scored}/{n} scenarios")
    if scored:
        print(f"localization — file        {file_hits}/{scored} = {file_hits / scored:.0%}")
        print(f"localization — file+func   {func_hits}/{scored} = {func_hits / scored:.0%}")
    print(f"no-LLM floor (all {n})       {base_hits}/{n} = {base_hits / n:.0%}")
    if scored == n:
        print(f"delta vs floor             {file_hits - base_hits:+d} scenario(s)")
    else:
        print("delta vs floor             not comparable — rerun with no upstream errors")

    hard = [r for r in rows if r[0] in ("alrt_003", "alrt_009")]
    hard_hits = sum(1 for r in hard if r[1] is True)
    print(f"\nthe two the floor cannot reach: {hard_hits}/2")
    for r in hard:
        print(f"  {r[0]}  {'ERR' if r[1] is None else ('hit' if r[1] else 'MISS')}  -> {r[4]}")

    print(f"\nescalated (confidence < {CONFIDENCE_THRESHOLD}): {escalated}/{n}")
    if latencies:
        print(f"latency  avg {sum(latencies) // len(latencies)}ms  "
              f"min {min(latencies)}ms  max {max(latencies)}ms")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
