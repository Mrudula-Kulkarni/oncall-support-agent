---
incident_id: INC-2026-0134
title: Feature flag misconfiguration disabled checkout for a slice of users
date: 2026-01-29
service: checkout-service
category: error_rate_spike
resolved_in_minutes: 19
---

**Symptom:** About 8% of users saw checkout fail with a generic error. The failing cohort was
stable across retries, and no deploy had gone out.

**Root cause:** A targeting rule on a flag intended for internal testing was saved with a
percentage rollout instead of a user-list match, disabling a required code path for part of
production traffic.

**Fix:** Corrected the targeting rule; recovery was immediate and required no deploy.

**Prevention:** Flag changes affecting checkout now require review, and flag state changes are
annotated onto the same dashboards as deploys.
