"""The no-embedding baseline for past-incident retrieval.

Same purpose as baseline.py does for localization: establish what trivial methods score before
claiming anything for the vector store. Spec §9.4 adds Chroma, and if plain keyword overlap
already retrieves the mirroring incident every time, the embeddings are decoration and the
honest thing is to say so.

Three baselines, all without a model or a vector store:

  category   filter the corpus to the alert's category, take them in file order. Measures how
             much the metadata alone narrows 18 incidents.
  overlap    rank by shared vocabulary between the alert text and each incident, with common
             words dropped. A poor man's BM25.
  overlap+   the same, plus the labelled bug_type. NOT a fair comparison for Chroma: bug_type
             is ground truth from the answer key, and at runtime Remediation sees only the
             Investigator's prose hypothesis. It is reported to show how much a single clean
             mechanism term is worth, and as a ceiling rather than a floor.

The fair floor is `overlap`, which uses only what is available at runtime.

    python3.13 baseline_retrieval.py [-v]
"""

import collections
import json
import pathlib
import re
import sys

DATA = pathlib.Path(__file__).resolve().parent / "data"

# Words too common across an incident corpus to carry signal.
STOPWORDS = set("""
a an and are as at be been but by for from had has have in into is it its of on or over that
the this to was were when which with without after before during no not any all more most some
service services request requests error errors issue incident caused cause root fix symptom
prevention resolved minutes time latency high low above below under than then they their
""".split())

TOKEN = re.compile(r"[a-z_][a-z0-9_]+")


def _tokens(text: str) -> collections.Counter:
    return collections.Counter(
        w for w in TOKEN.findall(text.lower()) if w not in STOPWORDS and len(w) > 2
    )


def _corpus() -> dict[str, dict]:
    out = {}
    for path in sorted((DATA / "incidents").glob("*.md")):
        text = path.read_text()
        category = re.search(r"^category:\s*(\S+)", text, re.M)
        out[path.stem] = {
            "text": text,
            "category": category.group(1) if category else None,
            "tokens": _tokens(text),
        }
    return out


def rank_by_category(corpus, alert, _bug_type=None) -> list[str]:
    same = [k for k, v in corpus.items() if v["category"] == alert["type"]]
    return same + [k for k in corpus if k not in same]


def rank_by_overlap(corpus, alert, bug_type=None) -> list[str]:
    query = f"{alert['message']} {' '.join(map(str, alert['metric'].keys()))}"
    if bug_type:
        query += " " + bug_type.replace("_", " ")
    q = _tokens(query)
    scored = []
    for key, doc in corpus.items():
        # Shared vocabulary, weighted by how often the query term appears in the incident.
        score = sum(count * doc["tokens"].get(term, 0) for term, count in q.items())
        scored.append((score, key))
    return [k for _, k in sorted(scored, key=lambda pair: (-pair[0], pair[1]))]


def main():
    verbose = "-v" in sys.argv
    scenarios = json.loads((DATA / "eval" / "labeled_test_set.json").read_text())["scenarios"]
    corpus = _corpus()
    n = len(scenarios)

    strategies = [
        ("category", rank_by_category, False),
        ("overlap", rank_by_overlap, False),
        ("overlap+bug_type", rank_by_overlap, True),
    ]

    print(f"corpus: {len(corpus)} incidents, {n} scenarios\n")
    results = {}

    for name, rank, use_bug in strategies:
        at1 = at3 = at5 = 0
        rows = []
        for s in scenarios:
            alert = json.loads((DATA / "alerts" / f"{s['alert_id']}.json").read_text())
            ranked = rank(corpus, alert, s["bug_type"] if use_bug else None)
            want = s["expected_incident_id"]
            pos = ranked.index(want) + 1 if want in ranked else None
            at1 += pos == 1
            at3 += pos is not None and pos <= 3
            at5 += pos is not None and pos <= 5
            rows.append((s["alert_id"], pos, ranked[0]))
        results[name] = (at1, at3, at5)
        print(f"{name:18} recall@1 {at1:>2}/{n}   recall@3 {at3:>2}/{n}   recall@5 {at5:>2}/{n}")
        if verbose:
            for aid, pos, top in rows:
                print(f"    {aid}  mirror at rank {str(pos):>4}   top={top}")
            print()

    fair = results["overlap"]
    print(f"\nFAIR floor (runtime-available input only): overlap "
          f"— recall@1 {fair[0]}/{n}, recall@3 {fair[1]}/{n} = {fair[1] / n:.0%}")
    print(f"CEILING with the labelled bug_type:        overlap+bug_type "
          f"— recall@3 {results['overlap+bug_type'][1]}/{n}")
    print()
    print("Read this before claiming anything for the vector store: on an 18-document corpus")
    print("whose mirroring incidents were authored in the same vocabulary as the alerts, there")
    print("is almost no headroom above keyword matching. Report Chroma against the fair floor.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
