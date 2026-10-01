"""Vector store over the past-incident corpus (spec §9.4).

Chroma with its default embedding function, which runs locally via onnxruntime — no embedding
API, so the demo stays free per spec §10's reasoning about cost.

**Read this before quoting a retrieval number.** `baseline_retrieval.py` measures what trivial
keyword overlap scores on the same task: recall@3 of 11/12 using only runtime-available input,
and 12/12 when handed the labelled bug_type. There is at most one scenario of headroom above a
40-line keyword matcher, because the corpus is 18 documents and the eight mirroring incidents
were authored in the same vocabulary as the alerts they mirror — `alrt_003` says "memory at 94%
of limit and climbing", `inc_002` says "memory sat above 90% of its limit". Embeddings earn
their place by bridging vocabulary gaps, and this corpus has none to bridge.

That is a property of the fixtures, not a defect in the retrieval, and it is worth stating
plainly rather than reporting a saturated metric as a win. Embeddings would pull ahead with
paraphrase, a larger corpus, or incidents not written in the alert's own words.

The index is built on first use and persisted under `chroma_db/`, which is gitignored and
regenerated from `data/incidents/`.
"""

import functools
import pathlib
import re

import chromadb

DATA = pathlib.Path(__file__).resolve().parent.parent / "data"
PERSIST_DIR = pathlib.Path(__file__).resolve().parent.parent / "chroma_db"
COLLECTION = "past_incidents"


def _parse(path: pathlib.Path) -> dict:
    """Split an incident file into frontmatter metadata and body text."""
    text = path.read_text()
    meta = {}
    for key in ("incident_id", "title", "date", "service", "category", "resolved_in_minutes"):
        match = re.search(rf"^{key}:\s*(.+)$", text, re.M)
        if match:
            meta[key] = match.group(1).strip()
    body = re.sub(r"^---.*?---\s*", "", text, flags=re.S)
    return {"id": path.stem, "meta": meta, "body": body.strip(), "full": text}


@functools.lru_cache(maxsize=1)
def _collection():
    """The incident collection, built on first use.

    Rebuilt whenever the document count disagrees with the corpus on disk, so editing a fixture
    does not leave a stale index silently answering queries.
    """
    client = chromadb.PersistentClient(path=str(PERSIST_DIR))
    docs = [_parse(p) for p in sorted((DATA / "incidents").glob("*.md"))]
    collection = client.get_or_create_collection(COLLECTION)

    if collection.count() != len(docs):
        if collection.count():
            client.delete_collection(COLLECTION)
            collection = client.get_or_create_collection(COLLECTION)
        collection.add(
            ids=[d["id"] for d in docs],
            # The whole file, frontmatter included: the title and category carry as much signal
            # as the body for this corpus.
            documents=[d["full"] for d in docs],
            metadatas=[
                {
                    # Both names for the same document. The corpus identifies incidents two
                    # ways: the filename stem, which labeled_test_set.json uses, and the
                    # frontmatter incident_id, which is what the document calls itself and so
                    # what a model naturally cites. Carrying both lets a citation be accepted
                    # under either and normalised to the stem the eval scores against.
                    "incident_ref": d["meta"].get("incident_id", ""),
                    "title": d["meta"].get("title", ""),
                    "category": d["meta"].get("category", ""),
                    "service": d["meta"].get("service", ""),
                    "resolved_in_minutes": d["meta"].get("resolved_in_minutes", ""),
                }
                for d in docs
            ],
        )
    return collection


def search(query: str, k: int = 3, category: str | None = None) -> list[dict]:
    """The k incidents nearest `query`, nearest first.

    `category` is a soft filter: it is tried first, and the search falls back to the whole
    corpus if the category yields nothing. A hard filter would hide a relevant incident whose
    category was classified differently, and the categories are coarse — seven of eighteen
    incidents are error_rate_spike.
    """
    collection = _collection()
    where = {"category": category} if category else None

    result = collection.query(query_texts=[query], n_results=k, where=where)
    if not result["ids"][0] and where:
        result = collection.query(query_texts=[query], n_results=k)

    return [
        {
            "incident_id": doc_id,
            "incident_ref": meta.get("incident_ref", ""),
            "title": meta.get("title", ""),
            "category": meta.get("category", ""),
            "service": meta.get("service", ""),
            "resolved_in_minutes": meta.get("resolved_in_minutes", ""),
            "distance": distance,
            "text": document,
        }
        for doc_id, meta, distance, document in zip(
            result["ids"][0],
            result["metadatas"][0],
            result["distances"][0],
            result["documents"][0],
        )
    ]


def reset() -> None:
    """Drop the index so the next search rebuilds it. For tests and fixture edits."""
    _collection.cache_clear()
    client = chromadb.PersistentClient(path=str(PERSIST_DIR))
    try:
        client.delete_collection(COLLECTION)
    except Exception:
        pass
