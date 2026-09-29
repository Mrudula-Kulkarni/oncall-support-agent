"""Checks the synthetic data against itself.

Every label in the eval set must point at a file that exists, a function actually defined
in it, a deploy that touched that file, and a runbook for its category. Run after editing
any fixture.

    python3.13 verify_data.py
"""

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "backend" / "data"


def main():
    scenarios = json.loads((DATA / "eval" / "labeled_test_set.json").read_text())["scenarios"]
    alerts = {p.stem for p in (DATA / "alerts").glob("*.json")}
    logs = {p.stem for p in (DATA / "logs").glob("*.json")}
    deploys = {p.stem for p in (DATA / "deploys").glob("*.json")}
    runbooks = {p.stem for p in (DATA / "runbooks").glob("*.md")}
    incidents = list((DATA / "incidents").glob("*.md"))

    problems = []

    for path in DATA.rglob("*.json"):
        try:
            json.loads(path.read_text())
        except json.JSONDecodeError as exc:
            problems.append(f"{path.relative_to(ROOT)}: invalid JSON — {exc}")

    for s in scenarios:
        aid = s["alert_id"]

        if aid not in alerts:
            problems.append(f"{aid}: no alert fixture")
            continue

        alert = json.loads((DATA / "alerts" / f"{aid}.json").read_text())
        if alert["service_id"] != s["service_id"]:
            problems.append(f"{aid}: service mismatch — alert says {alert['service_id']}, "
                            f"label says {s['service_id']}")
        if alert["type"] != s["expected_category"]:
            problems.append(f"{aid}: category mismatch — alert says {alert['type']}, "
                            f"label says {s['expected_category']}")

        source = ROOT / s["expected_file"]
        if not source.exists():
            problems.append(f"{aid}: expected_file does not exist — {s['expected_file']}")
        else:
            text = source.read_text()
            if s["expected_function"] not in s["acceptable_functions"]:
                problems.append(f"{aid}: expected_function missing from acceptable_functions")
            for fn in s["acceptable_functions"]:
                if not re.search(rf"^\s*(def {fn}\b|class {fn}\b|{fn} = )", text, re.M):
                    problems.append(f"{aid}: '{fn}' is not defined in {s['expected_file']}")

        if s["service_id"] not in logs:
            problems.append(f"{aid}: no log fixture for {s['service_id']}")
        if s["service_id"] not in deploys:
            problems.append(f"{aid}: no deploy fixture for {s['service_id']}")
        else:
            history = json.loads((DATA / "deploys" / f"{s['service_id']}.json").read_text())
            match = next((d for d in history
                          if d["deploy_id"] == s["introducing_deploy_id"]), None)
            if match is None:
                problems.append(f"{aid}: introducing deploy {s['introducing_deploy_id']} "
                                f"is not in the deploy history")
            elif s["expected_file"].replace("sample_repo/", "") not in match["changed_files"]:
                problems.append(f"{aid}: deploy {s['introducing_deploy_id']} does not list "
                                f"the expected file in changed_files")

        if s["expected_category"] not in runbooks:
            problems.append(f"{aid}: no runbook for category {s['expected_category']}")

    unlabeled = alerts - {s["alert_id"] for s in scenarios}
    if unlabeled:
        problems.append(f"alerts with no ground-truth label: {sorted(unlabeled)}")

    bugs = {(s["expected_file"], s["expected_function"]) for s in scenarios}
    print(f"alerts          {len(alerts)}")
    print(f"labeled         {len(scenarios)}")
    print(f"distinct bugs   {len(bugs)}")
    print(f"services        {len(logs)} log / {len(deploys)} deploy fixtures")
    print(f"incidents       {len(incidents)}")
    print(f"runbooks        {len(runbooks)}")
    print()

    if problems:
        print(f"FAILED — {len(problems)} problem(s):")
        for p in problems:
            print(f"  - {p}")
        return 1

    print("OK — every label resolves to a real file, function, deploy and runbook.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
