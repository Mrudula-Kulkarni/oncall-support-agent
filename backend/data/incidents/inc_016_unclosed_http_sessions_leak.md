---
incident_id: INC-2025-0921
title: Unclosed HTTP sessions leaked memory and sockets in a background job
date: 2025-09-24
service: crawler-job
category: latency_spike
resolved_in_minutes: 108
---

**Symptom:** Job memory grew linearly across a run until the pod was OOM-killed near hour six.
Open socket count grew in step with memory.

**Root cause:** A new `requests.Session` was constructed per fetch and never closed, so
connections and their buffers were retained until the process died. Distinct from a cache that
grows without eviction: nothing was being stored on purpose, the resources simply were not
released.

**Fix:** Created one session for the run's lifetime and used a context manager to guarantee
cleanup.

**Prevention:** Long-running jobs now emit memory and socket counts periodically, so linear
growth is visible before an OOM.
