"""Scores whether the Remediation agent grounds its fix in the right past incident.

Retrieval accuracy (eval_retrieval.py) and grounding are different things. Retrieval can put the
mirroring incident in the top 3 while the agent writes a fix from a different one, or from
nothing. This measures what the agent actually cited:

  grounded        cited at least one retrieved incident at all
  correct         cited the mirror named by `expected_incident_id`
  precision       of all citations, the share that are the mirror — a fix citing all three
                  retrieved incidents is less useful than one citing the right one

A fix with no citation is the failure that matters most, because the agent's entire claim is
that its proposal comes from what resolved a similar incident before.

    python3.13 eval_remediation.py [-v]
"""

import json
import pathlib
import sys
import time

from app.agents.investigator import run_investigator
from app.agents.remediation import run_remediation
from app.agents.triage import run_triage
from app.data_access import load_alert

DATA = pathlib.Path(__file__).resolve().parent / "data"
RETRIES = 4
BACKOFF_SECONDS = 20
PACE_SECONDS = 2


def _with_retry(alert):
    last = None
    for attempt in range(RETRIES):
        try:
            triage = run_triage(alert)
            inv = run_investigator(alert, triage)
            return triage, inv, run_remediation(alert, triage, inv)
        except Exception as exc:
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
    n = len(scenarios)

    grounded = correct = 0
    precision_num = precision_den = 0
    errors = []
    rows = []

    for s in scenarios:
        alert = load_alert(s["alert_id"])
        want = s["expected_incident_id"]
        try:
            _, inv, rem = _with_retry(alert)
        except Exception as exc:
            errors.append((s["alert_id"], type(exc).__name__))
            rows.append((s["alert_id"], None, None, [], want))
            continue

        cites = rem.referenced_incidents
        is_grounded = bool(cites)
        is_correct = want in cites
        grounded += is_grounded
        correct += is_correct
        precision_num += sum(1 for c in cites if c == want)
        precision_den += len(cites)
        rows.append((s["alert_id"], is_grounded, is_correct, cites, want))

        if verbose:
            print(f"  {s['alert_id']}  cites={cites}")
            print(f"      {rem.suggested_fix[:220].replace(chr(10), ' ')}\n")
        time.sleep(PACE_SECONDS)

    print(f"{'alert':9} {'grounded':9} {'correct':8} citations")
    print("-" * 82)
    for aid, g, c, cites, want in rows:
        gm = "ERR" if g is None else ("yes" if g else "NO")
        cm = "-" if c is None else ("yes" if c else "no")
        print(f"{aid:9} {gm:9} {cm:8} {', '.join(cites) or '(none)'}")

    scored = n - len(errors)
    if errors:
        print(f"\n{len(errors)} scenario(s) failed upstream and are NOT scored:")
        for aid, kind in errors:
            print(f"  {aid}  {kind}")
    if scored:
        print(f"\ngrounded in some retrieved incident  {grounded}/{scored} = {grounded / scored:.0%}")
        print(f"cited the expected mirror            {correct}/{scored} = {correct / scored:.0%}")
    if precision_den:
        print(f"citation precision                   {precision_num}/{precision_den} = "
              f"{precision_num / precision_den:.0%}")
    print("\nNote: retrieval puts the mirror in the top 3 for 12/12 (eval_retrieval.py), so a")
    print("miss here is the agent choosing to write from a different case, not a retrieval gap.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
