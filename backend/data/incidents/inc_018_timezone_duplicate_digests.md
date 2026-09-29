---
incident_id: INC-2026-0361
title: Timezone handling bug caused duplicate nightly digest sends
date: 2026-03-22
service: notification-service
category: error_rate_spike
resolved_in_minutes: 145
---

**Symptom:** A subset of users received the nightly digest twice. No errors were raised; send
volume was simply higher than the user count.

**Root cause:** The scheduler computed "today" in local time while the deduplication key was
derived in UTC. For users in timezones where those dates differed, the dedupe key changed
between the two windows and the send was not recognised as already delivered.

**Fix:** Made the dedupe key UTC-only and idempotent per user per calendar day.

**Prevention:** A send-count-versus-eligible-user-count check now runs after each digest
batch.
