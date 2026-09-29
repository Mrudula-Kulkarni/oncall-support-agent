---
incident_id: INC-2026-0503
title: Deploy rolled back after a schema migration locked a hot table
date: 2026-04-27
service: orders-service
category: failed_deploy
resolved_in_minutes: 26
---

**Symptom:** Write latency on orders spiked to timeouts moments after a deploy began. Reads
were unaffected.

**Root cause:** The deploy ran a migration adding a NOT NULL column with a default to a large
table, taking an exclusive lock for the duration of the table rewrite and blocking writes.

**Fix:** Rolled back the deploy and aborted the migration. Re-shipped as a nullable column
plus a batched backfill, with the constraint added afterwards.

**Prevention:** Migrations touching tables above a row threshold now require a documented lock
analysis before merge.
