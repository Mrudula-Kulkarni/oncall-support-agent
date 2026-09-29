---
incident_id: INC-2026-0451
title: Client upgrade to a v3 API broke on a renamed response field
date: 2026-04-14
service: fulfillment-service
category: failed_deploy
resolved_in_minutes: 12
---

**Symptom:** Immediately after a deploy, effectively every request to one endpoint failed
with `KeyError` on a field read from a downstream JSON response. Error rate went from
baseline to ~98% within minutes of rollout, with no other change in flight.

**Root cause:** The deploy pointed the client at the downstream service's v3 API. v3 renamed
the identifier field in its response body, and the calling code still indexed the v2 key. The
migration changed the URL but not the response parsing.

**Fix:** Rolled back the deploy, which restored service in minutes. Re-shipped with the
response key updated and a tolerant read that accepts either field name during the migration
window.

**Prevention:** API version bumps now require a recorded sample of the new response body in
tests, so a renamed field fails in CI rather than in production.
