---
incident_id: INC-2026-0233
title: Unbounded in-process cache exhausted container memory in search-service
date: 2026-02-09
service: search-service
category: latency_spike
resolved_in_minutes: 96
---

**Symptom:** p99 latency drifted from ~300ms to over 4s across several days. Container
memory sat above 90% of its limit and GC pause times grew to ~800ms. No single slow query
explained it.

**Root cause:** A dictionary-backed cache added two weeks earlier stored every entry it ever
read and never evicted. A TTL constant was defined but never enforced on read or by any
sweep, so the map grew without bound until GC pressure dominated request time.

**Fix:** Replaced the plain dict with a size-capped LRU and enforced the existing TTL on
read. Restarted pods to clear the accumulated heap.

**Prevention:** Cache entry count is now a published gauge with an alert at 50k entries, and
"is eviction enforced?" is a checklist item on any cache review.
