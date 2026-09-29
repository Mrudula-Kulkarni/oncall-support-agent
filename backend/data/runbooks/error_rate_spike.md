---
category: error_rate_spike
title: Runbook — Error rate spike
owner: platform-oncall
---

## First five minutes

1. Confirm the spike is real: compare the current error rate against the same window
   yesterday, not just against the baseline constant.
2. Check whether errors are concentrated in one endpoint, one pod, or one customer cohort.
   A stable failing cohort points at configuration or data; an even spread points at code.
3. Pull the most recent deploy for the service. If a deploy landed within 30 minutes of onset,
   treat rollback as the default action.

## Diagnosis

- Read the top stack trace rather than the error count. One trace usually names the file and
  function.
- Distinguish transient upstream errors (timeouts, 502/503/504) from logic errors
  (`AttributeError`, `KeyError`, `TypeError`). Transient errors that reach the customer
  usually mean retry or fallback coverage is missing, not that the upstream is broken.
- If failures are not reproducible on retry, suspect concurrency: shared mutable state,
  check-then-act races, or cache mutation without a lock.

## Mitigation

- Deploy-correlated: roll back first, diagnose after.
- Missing retry coverage: restore retries with bounded attempts and backoff.
- Unhandled optional data: guard the dereference and ship as a hotfix.

## Escalation

Page the service owner if the error rate exceeds 25% for more than 10 minutes, or if revenue
impact is estimated above $10k.
