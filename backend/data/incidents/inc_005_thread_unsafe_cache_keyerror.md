---
incident_id: INC-2026-0341
title: Thread-unsafe shared cache produced intermittent KeyError under load
date: 2026-03-17
service: rate-limiter
category: error_rate_spike
resolved_in_minutes: 74
---

**Symptom:** Roughly 20% of requests failed during peak traffic, and the failures were not
reproducible — the identical request succeeded on retry. Traces showed `KeyError` on a
dictionary delete inside the shared cache lookup path.

**Root cause:** A module-level dict was read, checked for expiry, deleted and repopulated
without any lock, while multiple threads per worker executed the same path. Two threads could
both observe the entry as expired; the first `del` succeeded and the second raised. The
classic check-then-act race — correct in a single-threaded test, wrong under the threaded
server config running in production.

**Fix:** Serialized mutation behind a lock and made the delete non-raising
(`dict.pop(key, None)`), which removed the failure mode even under contention.

**Prevention:** Any shared mutable module-level state now needs an explicit note on how it
behaves under the deployed concurrency model before review passes.
