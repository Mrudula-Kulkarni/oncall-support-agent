---
category: service_down
title: Runbook — Service down / crash loop
owner: platform-oncall
---

## First five minutes

1. Confirm healthy pod count versus expected. Zero healthy replicas is a page, not a ticket.
2. Read the final log lines before the last restart. A crash loop almost always ends in one
   unhandled exception, and that trace is the answer.
3. Check queue depth for any consumer the service drains, and note it — backlog drives the
   recovery plan even after the crash is fixed.

## Diagnosis

- Repeating identical trace on every restart: the process dies on the same input each time.
  For queue consumers this is the poison-message pattern — the message is redelivered, the
  worker crashes, the supervisor restarts it, forever.
- Exception escaping a worker loop: per-item failures must never propagate out of the loop.
- Crash immediately on boot: suspect configuration or a missing environment variable.

## Mitigation

- Poison message: stop the consumer, move the offending message to a dead-letter queue, then
  restart.
- Missing error handling: wrap per-item processing in try/except with a retry count and a
  dead-letter path after N attempts.
- After recovery, drain the backlog deliberately and watch downstream load.

## Escalation

Any service with zero healthy replicas in production pages the owning team immediately.
