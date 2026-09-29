---
incident_id: INC-2025-1287
title: Unhandled 503 from a downstream service killed the export worker
date: 2025-12-03
service: reporting-service
category: service_down
resolved_in_minutes: 118
---

**Symptom:** All export worker pods entered CrashLoopBackOff overnight. Queue depth grew past
1,300 with no healthy consumer. Logs ended in an unhandled `HTTPError: 503` raised from the
worker's main loop.

**Root cause:** The worker called a downstream HTTP API with no exception handling inside its
processing loop. When that dependency had a brief outage, `raise_for_status()` propagated out
of the loop and terminated the process; the supervisor restarted it, it picked the same
message off the queue, and crashed again.

**Fix:** Wrapped per-message processing in a try/except that logs the failure, nacks the
message with a retry count, and moves it to a dead-letter queue after five attempts, so one
bad message can no longer take down the consumer.

**Prevention:** Established the rule that a worker loop must never let a per-item exception
escape, plus an alert on dead-letter queue depth.
