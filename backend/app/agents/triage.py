"""Triage agent (spec §4.1): classify an alert's severity and category.

Single LLM call, no tools.

The prompt is built from an explicit allowlist of alert fields, and `alert.type` is NOT in
it. That field holds the category the agent is being asked to produce — `verify_data.py`
asserts `alert["type"] == expected_category` for all 12 scenarios — so passing the whole
alert would turn classification into a field copy and make the eval score meaningless.
`eval_triage.py` grades against that same field.
"""

import json

from ..llm import get_llm
from ..models import Alert, TriageOutput

# Fields the agent is allowed to see. Adding `type` here would leak the answer.
VISIBLE_FIELDS = ("service_id", "message", "metric", "source", "timestamp", "environment")

SYSTEM_PROMPT = """\
You are the triage step of an on-call incident response pipeline. You receive one production \
alert and classify it. You do not diagnose the cause — a later agent does that.

Assign `category`, describing what kind of failure this is:
- error_rate_spike: requests are failing at an elevated rate, but the service is serving
- latency_spike: requests are slow, or a resource is exhausting toward a limit
- service_down: the service is not serving at all (crash loop, all pods unavailable)
- failed_deploy: the failure began immediately after a named deploy and tracks it

Apply these in order — several categories often describe the same incident, and the right one
names the MECHANISM, not the most visible symptom:

1. If the metrics tie onset to a deploy (a deploy id plus a small `minutes_since_deploy`, or
   a message saying the failure began after a named rollout), it is failed_deploy. This wins
   even when the symptom is a large error rate or a total outage — "what broke" is the deploy.
2. Otherwise, if the service is not serving at all, it is service_down.
3. Otherwise, decide from WHICH metric is elevated against its own baseline — the `metric`
   object pairs a reading with its baseline, and that pairing is the evidence, not the wording
   of the message:
   - a latency or resource reading above its baseline (`p99_latency_ms` vs
     `baseline_p99_latency_ms`, memory against a limit) means latency_spike
   - an error reading above its baseline (`error_rate` vs `baseline_error_rate`) means
     error_rate_spike
   Do not classify on the word "timeout". A timeout can be either: it is latency_spike when a
   latency metric is elevated, and error_rate_spike when only the error rate is, with the
   timeout named as the cause of those failures. A raw count with no baseline to compare it
   against (`gateway_timeout_count_5m`) decides nothing on its own.
4. If nothing above settles it, it is error_rate_spike.

Assign `severity` from customer impact and blast radius, not from how alarming the text reads:
- critical: revenue-taking or auth path broadly broken; most requests failing
- high: material customer impact, or a fast-worsening trend
- medium: degraded but serving; contained, or affecting a subset
- low: little customer impact; cleanup or investigation can wait

`short_reason` is one sentence, under 25 words, naming the observation that decided it."""


def _visible_alert(alert: Alert) -> str:
    payload = {
        field: value
        for field in VISIBLE_FIELDS
        if (value := getattr(alert, field, None)) not in (None, {}, "")
    }
    return json.dumps(payload, indent=2)


def run_triage(alert: Alert) -> TriageOutput:
    """Classify one alert. Raises if the model returns something off-contract."""
    llm = get_llm().with_structured_output(TriageOutput)
    return llm.invoke(
        [
            ("system", SYSTEM_PROMPT),
            ("human", f"Classify this alert:\n\n{_visible_alert(alert)}"),
        ]
    )
