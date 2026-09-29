"""The no-LLM baseline for root-cause localization.

Most alerts carry a stack trace that names the failing file outright. Any accuracy
number for the Investigator has to be read against that, so this computes it: take
the service's logs, pull `File "..."` out of every traceback, guess the file that
appears most often. No LLM, no agent, no repo search.

Whatever the Investigator scores later is only interesting as a delta on this.

    python3.13 baseline.py [-v]
"""

import collections
import json
import pathlib
import re
import sys

DATA = pathlib.Path(__file__).resolve().parent / "data"
TRACE_LINE = re.compile(r'File "(services/[a-z_]+/[a-z_]+\.py)", line \d+, in (\w+)')


def guess(service_id):
    """Most frequently traced (file, function) in a service's logs."""
    entries = json.loads((DATA / "logs" / f"{service_id}.json").read_text())
    hits = [h for e in entries for h in TRACE_LINE.findall(e.get("trace", ""))]
    if not hits:
        return None
    return collections.Counter(hits).most_common(1)[0][0]


def main():
    verbose = "-v" in sys.argv
    scenarios = json.loads((DATA / "eval" / "labeled_test_set.json").read_text())["scenarios"]

    file_hits = func_hits = 0
    rows = []

    for s in scenarios:
        expected_file = s["expected_file"].replace("sample_repo/", "")
        g = guess(s["service_id"])
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
    print("no-LLM baseline — most-traced file in the service log")
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
