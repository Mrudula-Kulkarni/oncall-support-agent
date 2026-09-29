---
incident_id: INC-2026-0118
title: Retry decorator dropped during refactor surfaced transient provider timeouts
date: 2026-01-22
service: notification-service
category: error_rate_spike
resolved_in_minutes: 31
---

**Symptom:** Send failures jumped from ~1% to 19% with no change in provider health. Every
failure was a read timeout or a 504, and the same request succeeded when replayed by hand.

**Root cause:** A cleanup commit removed the `@with_retries` decorator from the outbound send
function while leaving it on neighbouring functions. Transient upstream errors that had
always existed were previously absorbed by three attempts with backoff; afterwards they went
straight to the caller.

**Fix:** Reapplied the retry decorator with three attempts and exponential backoff. Error
rate returned to baseline immediately after rollout.

**Prevention:** Retry coverage on outbound calls is asserted in tests that inject a transient
failure on the first attempt, so removing the decorator now fails CI.
