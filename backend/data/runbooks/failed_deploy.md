---
category: failed_deploy
title: Runbook — Failed deploy
owner: platform-oncall
---

## First five minutes

1. Roll back. Do not diagnose a deploy-correlated outage in production — a rollback is
   typically minutes, a root cause is typically an hour.
2. Confirm error onset lines up with the rollout timestamp. Minutes-since-deploy in single
   digits with near-total failure is conclusive enough to act on.
3. Freeze further deploys for the service until the cause is understood.

## Diagnosis

- Near-100% failure of one endpoint right after rollout: suspect a contract mismatch. Compare
  the actual downstream response body against the keys the code reads.
- API version bumps are a common source: a v2 to v3 migration may rename response fields, and
  changing the URL without changing the parsing breaks every call.
- Write latency spikes during rollout: suspect a migration holding a lock rather than the
  application code.

## Mitigation

- Contract mismatch: roll back, then re-ship with the correct key and a tolerant read that
  accepts both names during the migration window.
- Locking migration: abort it, re-plan as a nullable column plus batched backfill.

## Escalation

If rollback does not restore service within 10 minutes, escalate — the deploy may not be the
actual cause.
