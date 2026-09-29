---
incident_id: INC-2026-0572
title: Statement timeout tuned too aggressively caused writes to fail under normal load
date: 2026-05-06
service: audit-service
category: latency_spike
resolved_in_minutes: 38
---

**Symptom:** Several hundred write failures per five minutes with
`canceling statement due to statement timeout`. The database itself looked healthy: p99 query
time ~70ms, connection pool mostly idle, no lock contention. Notably, every failing query had
run for just over the configured limit.

**Root cause:** A "fail fast" change set the per-statement timeout to 50ms, below the normal
p99 for that insert. The database was never unhealthy — the ceiling was simply set under
routine latency, so ordinary writes were cancelled.

**Fix:** Raised the statement timeout to 3s, comfortably above observed p99 while still
bounding pathological queries.

**Prevention:** Timeout values must be justified against the last 30 days of p99 for the
statements they govern, not chosen as round numbers.
