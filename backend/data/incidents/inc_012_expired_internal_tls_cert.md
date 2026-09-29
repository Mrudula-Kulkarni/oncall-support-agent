---
incident_id: INC-2025-1078
title: Expired TLS certificate on an internal service broke all callers
date: 2025-11-01
service: ledger-service
category: service_down
resolved_in_minutes: 41
---

**Symptom:** Every caller of the ledger service began failing TLS verification at the same
instant. The service itself was healthy and serving.

**Root cause:** The internal certificate expired. Auto-renewal had silently stopped working
two months earlier when the issuing role's permissions changed.

**Fix:** Issued a new certificate manually and restored the renewal role's permissions.

**Prevention:** Certificate expiry is monitored with a 30-day warning independent of the
renewal system that is supposed to handle it.
