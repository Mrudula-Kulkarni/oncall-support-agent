"""Scores the Triage agent's category classification against the 12 labelled scenarios.

Category is gradeable because `labeled_test_set.json` names the expected one for every
scenario. The agent never sees it: `triage.VISIBLE_FIELDS` withholds `alert.type`, which
holds the same value — see DAY2_PLAN.md.

Severity is NOT graded, because no ground truth for it exists. Day 1 left severity out of the
alerts on purpose (deciding it is Triage's job), so this prints the distribution for a human
to sanity-check instead of scoring it.

    python3.13 eval_triage.py [-v]
"""

import collections
import json
import pathlib
import sys
import time

from app.agents.triage import run_triage
from app.data_access import load_alert
from app.llm import model_name

DATA = pathlib.Path(__file__).resolve().parent / "data"


def main():
    verbose = "-v" in sys.argv
    scenarios = json.loads((DATA / "eval" / "labeled_test_set.json").read_text())["scenarios"]

    correct = 0
    severities = collections.Counter()
    confusion = collections.Counter()
    latencies = []
    rows = []

    print(f"model: {model_name()}\nscoring {len(scenarios)} scenarios...\n")

    for s in scenarios:
        alert = load_alert(s["alert_id"])
        expected = s["expected_category"]
        started = time.perf_counter()
        try:
            out = run_triage(alert)
        except Exception as exc:
            rows.append((s["alert_id"], False, f"ERROR {type(exc).__name__}", expected, "-", 0))
            continue
        elapsed = int((time.perf_counter() - started) * 1000)
        latencies.append(elapsed)

        got = out.category.value
        ok = got == expected
        correct += ok
        severities[out.severity.value] += 1
        if not ok:
            confusion[(expected, got)] += 1
        rows.append((s["alert_id"], ok, got, expected, out.severity.value, elapsed))
        if verbose:
            print(f"  {s['alert_id']}  {out.severity.value:8}  {out.short_reason}")

    if verbose:
        print()

    for aid, ok, got, expected, sev, ms in rows:
        mark = "hit " if ok else "MISS"
        note = "" if ok else f"  (expected {expected})"
        print(f"{aid}  {mark}  {got:18} sev={sev:8} {ms:>5}ms{note}")

    n = len(scenarios)
    print(f"\ncategory accuracy   {correct}/{n} = {correct / n:.0%}")
    if confusion:
        print("confusions:")
        for (expected, got), count in confusion.most_common():
            print(f"  {expected} -> {got}   x{count}")
    if latencies:
        print(f"triage latency      avg {sum(latencies) // len(latencies)}ms  "
              f"min {min(latencies)}ms  max {max(latencies)}ms")
    print(f"severity spread     {dict(severities)}  (not scored — no ground truth)")
    return 0 if correct == n else 1


if __name__ == "__main__":
    sys.exit(main())
