---
incident_id: INC-2026-0067
title: Connection pool exhaustion during a flash sale
date: 2026-01-11
service: orders-service
category: latency_spike
resolved_in_minutes: 64
---

**Symptom:** p99 latency rose to 9s during a promotion. Requests queued waiting for database
connections; the database itself was only at 40% CPU.

**Root cause:** Pool size was 10 per pod and had not been revisited since the pod count was
halved. Under sale traffic, demand for connections exceeded the pool and requests blocked on
checkout rather than on query execution.

**Fix:** Raised pool size to 30 per pod and added a bounded wait with a clear error rather
than an unbounded block.

**Prevention:** Pool sizing is now derived from expected concurrency per pod and re-checked
whenever replica counts change.
