---
category: high_severity_escalation
title: Runbook — Escalation and human handoff
owner: incident-command
---

## When to escalate to a human immediately

- Automated root-cause confidence is low. A weak hypothesis acted on during an incident costs
  more time than it saves.
- Customer-facing failure above 25% of traffic, or estimated revenue impact above $10k.
- Any suspected data loss, data corruption, or security exposure. These never proceed on an
  automated suggestion.
- Zero healthy replicas in production.

## What a handoff must include

1. What is broken, in one sentence, in plain language.
2. The evidence gathered so far: alert, relevant log lines, recent deploys checked.
3. The current hypothesis and why confidence is low — which evidence is missing or conflicting.
4. Actions already taken, explicitly including "none".

## Standing rule

Suggest, never execute. Remediation output is a recommendation for a human to apply. No
automated rollback, restart, config change or data mutation is performed by the pipeline.
