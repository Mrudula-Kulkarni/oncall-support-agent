"""Locates candidate source files in the sample repo.

Spec §4.2 and §10 are explicit that code lookup is a direct repo search rather than an MCP
tool: a file search adds no capability by going through a protocol layer, so it does not get
one. Logs, deploys and runbooks do — those are in `data_access`.

This module is deliberately deterministic and contains no LLM call. It gathers and ranks
candidates from the evidence; the agent decides between them. Keeping the split means a wrong
answer can be attributed — either the right file was never offered, or it was offered and the
model picked another.

Ranking reflects how strong each kind of evidence actually is, measured against the labelled
set rather than guessed:

  traceback      a stack frame names the file outright. Strongest signal, and on its own a
                 nearest-traceback heuristic gets 10/12 (see baseline.py).
  logger         log entries are emitted by module-named loggers, so the name maps to a file.
                 Weaker: the nearest module-shaped logger is often the request entry point
                 rather than where the fault lives (9/12 alone).
  deploy         the file was changed by a deploy preceding the alert. Weak alone — the
                 introducing deploy for a gradual leak can be a week old — but it is the only
                 signal that reaches a file no log entry mentions.
  same_service   present in the service, unmentioned by any evidence. Included so the decoys
                 are in play and the choice is a real discrimination rather than a single
                 candidate handed over.
"""

import pathlib
import re
from datetime import datetime

REPO = pathlib.Path(__file__).resolve().parent.parent.parent / "sample_repo"

TRACE_LINE = re.compile(r'File "(services/[a-z_]+/[a-z_]+\.py)", line (\d+), in (\w+)')

# Rank order, strongest first.
EVIDENCE_RANK = ("traceback", "logger", "deploy", "same_service")


def _ts(stamp: str) -> datetime:
    return datetime.fromisoformat(stamp.replace("Z", "+00:00"))


def _exists(rel_path: str) -> bool:
    return (REPO / rel_path).is_file()


def service_dir(service_id: str) -> str:
    """'checkout-service' -> 'services/checkout_service'."""
    return f"services/{service_id.replace('-', '_')}"


def candidate_files(service_id, logs, deploys, alert_timestamp) -> list[dict]:
    """Rank the files that could hold the fault, strongest evidence first.

    Each entry is {path, evidence, detail, seconds_from_alert}. `seconds_from_alert` is None
    for candidates that no log entry mentions.
    """
    at = _ts(alert_timestamp)
    found: dict[str, dict] = {}

    def offer(path, evidence, detail, seconds=None):
        if not _exists(path):
            return
        prior = found.get(path)
        if prior and EVIDENCE_RANK.index(prior["evidence"]) <= EVIDENCE_RANK.index(evidence):
            return
        found[path] = {
            "path": path,
            "evidence": evidence,
            "detail": detail,
            "seconds_from_alert": seconds,
        }

    for entry in logs:
        delta = int((_ts(entry["timestamp"]) - at).total_seconds())
        for path, line, func in TRACE_LINE.findall(entry.get("trace", "")):
            offer(path, "traceback", f"stack frame at line {line} in {func}()", delta)
        logger = entry.get("logger", "")
        if logger.startswith("services."):
            offer(logger.replace(".", "/") + ".py", "logger",
                  f"emitted a {entry['level']} log entry", delta)

    # Only deploys that precede the alert could have introduced the fault.
    for deploy in deploys:
        if _ts(deploy["timestamp"]) > at:
            continue
        age_hours = int((at - _ts(deploy["timestamp"])).total_seconds() // 3600)
        for path in deploy.get("changed_files", []):
            offer(path, "deploy",
                  f"changed by {deploy['deploy_id']} {age_hours}h before the alert "
                  f"({deploy['summary']})")

    # Everything else in the service, plus the shared modules it depends on.
    for path in sorted(REPO.glob(f"{service_dir(service_id)}/*.py")):
        offer(str(path.relative_to(REPO)), "same_service", "present in this service")
    for path in sorted(REPO.glob("common/*.py")):
        offer(str(path.relative_to(REPO)), "same_service", "shared module")

    return sorted(
        found.values(),
        key=lambda c: (EVIDENCE_RANK.index(c["evidence"]),
                       abs(c["seconds_from_alert"]) if c["seconds_from_alert"] is not None
                       else 10**9),
    )


def read_source(rel_path: str) -> str:
    """Source of one repo file, or '' if it does not exist."""
    path = REPO / rel_path
    return path.read_text() if path.is_file() else ""


def defined_symbols(rel_path: str) -> list[str]:
    """Names a suspected_function may legitimately refer to in this file.

    Includes module-level bindings, not just def/class. Some defects live at module scope —
    `status_store.py` misconfigures `statement_timeout_ms` inside `_db = DBClient(...)`, which
    is in no function at all — and `_db` is the precise answer there. `verify_data.py` already
    accepts that form in `acceptable_functions`, so this has to agree with it or a correct
    answer gets flagged as bogus.
    """
    source = read_source(rel_path)
    return (
        re.findall(r"^\s*(?:def|class)\s+(\w+)", source, re.M)
        + re.findall(r"^(\w+)\s*=", source, re.M)
    )


def normalise_symbol(name: str) -> str:
    """'CartCache.get_cart' -> 'get_cart'.

    The model reports a qualified name when the function is a method. The labels use the bare
    name, so the qualified form is the same answer written differently, not a wrong one.
    """
    return name.rsplit(".", 1)[-1] if name else name
