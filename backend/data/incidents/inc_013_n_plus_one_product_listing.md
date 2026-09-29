---
incident_id: INC-2026-0295
title: N+1 query introduced in the product listing endpoint
date: 2026-03-04
service: catalog-service
category: latency_spike
resolved_in_minutes: 55
---

**Symptom:** Listing endpoint p99 went from 180ms to 2.3s after a feature release. Database
query volume tripled with no traffic increase.

**Root cause:** A new per-item availability field was fetched inside the render loop, issuing
one query per product rather than one query per page.

**Fix:** Batched the availability lookup into a single query keyed by the page's SKUs.

**Prevention:** Query-count assertions were added to the listing endpoint's tests.
