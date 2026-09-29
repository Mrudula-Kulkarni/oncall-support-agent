---
incident_id: INC-2025-1301
title: Redis failover caused 90 seconds of authentication errors
date: 2025-12-19
service: auth-service
category: error_rate_spike
resolved_in_minutes: 22
---

**Symptom:** A sharp 90-second spike of 401s and 500s on authenticated endpoints, which
recovered on its own before anyone finished reading the page.

**Root cause:** The managed Redis primary failed over. The client held connections to the old
primary and did not re-resolve the endpoint until its connections dropped, so session lookups
failed during the window.

**Fix:** No code change during the incident — it self-recovered. Follow-up enabled client-side
failover awareness and a short connection max-age so stale endpoints are re-resolved.

**Prevention:** Failover is now exercised in a quarterly game day rather than discovered in
production.
