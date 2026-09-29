---
incident_id: INC-2026-0412
title: Consumer lag after a partition rebalance delayed downstream updates
date: 2026-04-02
service: events-pipeline
category: latency_spike
resolved_in_minutes: 133
---

**Symptom:** Downstream data was 40 minutes stale. No errors anywhere — consumers reported
healthy while lag grew steadily.

**Root cause:** A rolling restart triggered repeated rebalances. With a long session timeout
and slow partition assignment, consumers spent more time rebalancing than consuming.

**Fix:** Tuned session timeout and max poll interval, and staged restarts so only one consumer
leaves the group at a time.

**Prevention:** Consumer lag now alerts on absolute staleness, since error-free staleness was
invisible to existing monitors.
