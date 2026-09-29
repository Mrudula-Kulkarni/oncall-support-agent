"""Prints everything an agent would see for one alert, so you can judge the evidence yourself.

The ground-truth answer stays hidden unless you ask for it, so you can check whether the
chain actually leads somewhere without knowing where it is supposed to land.

    python3.13 show_scenario.py alrt_010
    python3.13 show_scenario.py alrt_010 --answer
    python3.13 show_scenario.py --list
"""

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "backend" / "data"


def rule(title):
    print(f"\n{'=' * 78}\n{title}\n{'=' * 78}")


def show(alert_id, reveal):
    alert = json.loads((DATA / "alerts" / f"{alert_id}.json").read_text())
    service = alert["service_id"]

    rule(f"ALERT  {alert_id}")
    print(f"service    {service}")
    print(f"type       {alert['type']}")
    print(f"when       {alert['timestamp']}")
    print(f"source     {alert.get('source', '-')}")
    print(f"message    {alert['message']}")
    print("metric")
    for k, v in alert["metric"].items():
        print(f"    {k}: {v}")

    rule(f"LOGS  {service}")
    for entry in json.loads((DATA / "logs" / f"{service}.json").read_text()):
        print(f"[{entry['timestamp']}] {entry['level']:<8} {entry['logger']}")
        print(f"    {entry['message']}")
        if "trace" in entry:
            for line in entry["trace"].splitlines():
                print(f"    | {line}")
        print()

    rule(f"RECENT DEPLOYS  {service}")
    for d in json.loads((DATA / "deploys" / f"{service}.json").read_text()):
        print(f"{d['deploy_id']}  {d['timestamp']}  {d['author']}")
        print(f"    {d['summary']}")
        for f in d["changed_files"]:
            print(f"      ~ {f}")
        print()

    service_dir = ROOT / "sample_repo" / "services" / service.replace("-", "_")
    rule(f"CANDIDATE FILES  {service_dir.relative_to(ROOT)}")
    for p in sorted(service_dir.glob("*.py")):
        functions = [
            line.strip().split("(")[0].replace("def ", "").replace("class ", "")
            for line in p.read_text().splitlines()
            if line.strip().startswith(("def ", "class "))
        ]
        print(f"{p.name}")
        print(f"    {', '.join(functions)}")
    print("\nshared: sample_repo/common/db_client.py, sample_repo/common/http_client.py")

    if not reveal:
        rule("ANSWER")
        print("Hidden. Decide which file and function you would name, then re-run with --answer.")
        return

    label = next(
        s for s in json.loads((DATA / "eval" / "labeled_test_set.json").read_text())["scenarios"]
        if s["alert_id"] == alert_id
    )
    rule("ANSWER")
    print(f"file        {label['expected_file']}")
    print(f"function    {label['expected_function']}")
    print(f"also ok     {', '.join(label['acceptable_functions'])}")
    print(f"bug type    {label['bug_type']}")
    print(f"deploy      {label['introducing_deploy_id']}")
    print(f"note        {label['notes']}")


def main():
    args = [a for a in sys.argv[1:]]
    if not args or "--list" in args:
        scenarios = json.loads((DATA / "eval" / "labeled_test_set.json").read_text())["scenarios"]
        for s in scenarios:
            alert = json.loads((DATA / "alerts" / f"{s['alert_id']}.json").read_text())
            print(f"{s['alert_id']}  {s['service_id']:<22} {alert['type']:<18} {alert['message'][:58]}")
        return 0

    alert_id = args[0]
    if not (DATA / "alerts" / f"{alert_id}.json").exists():
        print(f"no such alert: {alert_id}  (try --list)")
        return 1
    show(alert_id, reveal="--answer" in args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
