---
category: latency_spike
title: Runbook — Latency spike
owner: platform-oncall
---

## First five minutes

1. Establish whether latency is CPU-bound, memory-bound, IO-bound or lock-bound before
   changing anything. The fix differs entirely by class.
2. Check container memory against its limit and GC pause times. Memory above ~90% of limit
   with growing pause times means the process is spending its time collecting, not serving.
3. Check the database independently: p99 query time, pool utilization, lock waits. A healthy
   database during an application latency spike moves suspicion into the application.

## Diagnosis

- Growing memory with no traffic change: look for a cache or collection that accumulates
  without eviction. Check whether a declared TTL is actually enforced on read or by a sweep.
- Query volume up without traffic up: suspect a per-item query inside a loop (N+1).
- Timeouts where the database looks healthy: compare the configured timeout against observed
  p99 for that statement. A timeout set below normal p99 fails ordinary work.
- Staleness with no errors at all: suspect consumer lag or a silently skipped batch.

## Mitigation

- Unbounded cache: cap size, enforce TTL, restart pods to reclaim the heap.
- Timeout set too low: raise it above observed p99, keeping a ceiling for pathological queries.
- Pool exhaustion: raise pool size to match per-pod concurrency.

## Escalation

Page the service owner if p99 exceeds 5x baseline for more than 15 minutes.
