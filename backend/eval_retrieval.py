"""Scores Chroma retrieval against the no-embedding floor from baseline_retrieval.py.

Both are given the same input, which is the only way the comparison means anything. The default
query is the alert text alone, matching the `overlap` baseline. `--with-investigator` instead
runs the real pipeline query — the Investigator's hypothesis plus the located file — which is
what Remediation actually sees, at the cost of 12 LLM calls.

Expect the two to tie or very nearly. There is at most one scenario of headroom above keyword
matching on an 18-document corpus whose mirroring incidents were authored in the alert's own
vocabulary. That is worth reporting as a finding about the data rather than hidden behind a
number that looks like a win.

    python3.13 eval_retrieval.py [-v] [--with-investigator]
"""

import json
import pathlib
import sys

from app import rag
from baseline_retrieval import _corpus, rank_by_overlap

DATA = pathlib.Path(__file__).resolve().parent / "data"


def _alert_query(alert: dict) -> str:
    return f"{alert['message']} {' '.join(alert['metric'].keys())}"


def main():
    verbose = "-v" in sys.argv
    with_investigator = "--with-investigator" in sys.argv
    scenarios = json.loads((DATA / "eval" / "labeled_test_set.json").read_text())["scenarios"]
    corpus = _corpus()
    n = len(scenarios)

    if with_investigator:
        from app.agents.investigator import run_investigator
        from app.agents.triage import run_triage
        from app.data_access import load_alert

    chroma = {1: 0, 3: 0, 5: 0}
    keyword = {1: 0, 3: 0, 5: 0}
    rows = []

    for s in scenarios:
        alert = json.loads((DATA / "alerts" / f"{s['alert_id']}.json").read_text())
        want = s["expected_incident_id"]

        if with_investigator:
            alert_model = load_alert(s["alert_id"])
            inv = run_investigator(alert_model, run_triage(alert_model))
            query = f"{inv.hypothesis} {inv.suspected_file} {' '.join(inv.evidence)}"
        else:
            query = _alert_query(alert)

        # Both strategies see the identical query.
        got = [h["incident_id"] for h in rag.search(query, k=5)]
        kw = rank_by_overlap(corpus, alert, None)[:5]

        c_pos = got.index(want) + 1 if want in got else None
        k_pos = kw.index(want) + 1 if want in kw else None
        for cut in (1, 3, 5):
            chroma[cut] += c_pos is not None and c_pos <= cut
            keyword[cut] += k_pos is not None and k_pos <= cut
        rows.append((s["alert_id"], c_pos, k_pos, got[0], want))

    label = "investigator hypothesis" if with_investigator else "alert text"
    print(f"query: {label}   corpus: {len(corpus)} incidents   scenarios: {n}\n")
    print(f"{'alert':9} {'chroma':8} {'keyword':9} {'chroma top hit':50}")
    print("-" * 80)
    for aid, c_pos, k_pos, top, want in rows:
        flag = "" if c_pos == 1 else ("  <- mirror not first" if c_pos else "  <- MISS in top 5")
        print(f"{aid:9} {str(c_pos):8} {str(k_pos):9} {top[:50]:50}{flag}")

    print(f"\n{'':18} recall@1    recall@3    recall@5")
    print(f"{'chroma':18} {chroma[1]:>5}/{n}     {chroma[3]:>5}/{n}     {chroma[5]:>5}/{n}")
    print(f"{'keyword (no LLM)':18} {keyword[1]:>5}/{n}     {keyword[3]:>5}/{n}     {keyword[5]:>5}/{n}")

    delta3 = chroma[3] - keyword[3]
    print(f"\ndelta at recall@3: {delta3:+d} scenario(s)")
    if delta3 <= 0:
        print("Chroma does not beat keyword matching here. Report it that way — the corpus is 18")
        print("documents and the mirroring incidents share the alerts' vocabulary, so there is")
        print("no vocabulary gap for embeddings to bridge. They would win on paraphrase or scale.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
