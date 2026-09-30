"""The no-LLM baseline for root-cause localization.

Most alerts carry a stack trace that names the failing file outright. Any accuracy
number for the Investigator has to be read against that, so this computes it: take
the service's logs, find the traceback closest in time to the alert, and name the
deepest frame in it. No LLM, no agent, no repo search.

"Closest to the alert" rather than "most frequent": a service's log holds evidence for
two or three different incidents, so frequency counts traces belonging to other alerts.
It also ties — payment-service has exactly one traceback per file — and a tie resolved
by file order made this score swing between 8/12 and 9/12 on nothing but fixture
ordering. Time to the alert is what an engineer actually uses, and it is deterministic.

Whatever the Investigator scores later is only interesting as a delta on this.

    python3.13 baseline.py [-v]
"""

import json
import pathlib
import re
import sys
from datetime import datetime

DATA = pathlib.Path(__file__).resolve().parent / "data"
TRACE_LINE = re.compile(r'File "(services/[a-z_]+/[a-z_]+\.py)", line \d+, in (\w+)')


def _ts(stamp):
    return datetime.fromisoformat(stamp.replace("Z", "+00:00"))


def guess(service_id, alert_timestamp):
    """The (file, function) from the traceback nearest in time to the alert."""
    entries = json.loads((DATA / "logs" / f"{service_id}.json").read_text())
    at = _ts(alert_timestamp)
    traced = [e for e in entries if TRACE_LINE.search(e.get("trace", ""))]
    if not traced:
        return None
    nearest = min(traced, key=lambda e: abs((_ts(e["timestamp"]) - at).total_seconds()))
    # The deepest frame is where the exception was raised, which is the convention the
    # labels follow; acceptable_functions covers the cases where the caller is fair too.
    return TRACE_LINE.findall(nearest["trace"])[-1]


def main():
    verbose = "-v" in sys.argv
    scenarios = json.loads((DATA / "eval" / "labeled_test_set.json").read_text())["scenarios"]

    file_hits = func_hits = 0
    rows = []

    for s in scenarios:
        expected_file = s["expected_file"].replace("sample_repo/", "")
        alert = json.loads((DATA / "alerts" / f"{s['alert_id']}.json").read_text())
        g = guess(s["service_id"], alert["timestamp"])
        got_file = g is not None and g[0] == expected_file
        got_func = got_file and g[1] in s["acceptable_functions"]
        file_hits += got_file
        func_hits += got_func
        rows.append((s["alert_id"], got_file, g, expected_file))

    if verbose:
        for aid, ok, g, expected in rows:
            mark = "hit " if ok else "MISS"
            guessed = f"{g[0]}:{g[1]}" if g else "(no traceback in logs)"
            print(f"{aid}  {mark}  guessed {guessed}")
            if not ok:
                print(f"{'':19}expected {expected}")
        print()

    n = len(scenarios)
    print("no-LLM baseline — nearest traceback to the alert")
    print(f"  file           {file_hits}/{n} = {file_hits / n:.0%}")
    print(f"  file+function  {func_hits}/{n} = {func_hits / n:.0%}")
    print()
    print(f"{n - file_hits} scenario(s) need inference rather than a traceback:")
    for aid, ok, _, _ in rows:
        if not ok:
            print(f"  {aid}")
    print()
    print("Report the Investigator's accuracy against these numbers, not on its own.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
