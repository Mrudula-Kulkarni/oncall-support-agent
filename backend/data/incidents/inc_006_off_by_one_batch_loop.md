---
incident_id: INC-2025-0994
title: Off-by-one in a batch loop silently dropped the last record of every batch
date: 2025-10-08
service: pricing-service
category: error_rate_spike
resolved_in_minutes: 210
---

**Symptom:** A small percentage of records held stale values for days. Nothing errored — the
job reported success every run. Logs showed batches where the received count was always
exactly one higher than the written count.

**Root cause:** The loop iterated `range(len(items) - 1)`, an off-by-one that skipped the
final element of each batch. With 500-record batches, 1 in 500 records was never written on
any run, and the same records were skipped repeatedly because batch boundaries were stable.

**Fix:** Iterated the collection directly rather than over a computed index range. Backfilled
the affected records with a one-off full resync.

**Prevention:** The job now fails loudly when written count does not equal received count,
turning a silent data bug into an alert.
