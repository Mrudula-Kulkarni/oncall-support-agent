---
incident_id: INC-2026-0189
title: Debug logging left enabled filled the node disk
date: 2026-02-02
service: search-service
category: service_down
resolved_in_minutes: 87
---

**Symptom:** Pods across a node went unready simultaneously. Writes failed with "no space left
on device".

**Root cause:** A debugging session set the log level to DEBUG via an env var override that
was never reverted. Request-level logging filled the node's ephemeral storage over three days.

**Fix:** Reverted the log level and pruned log volumes to restore the node.

**Prevention:** Log level is pinned by config rather than per-pod env override, and disk usage
now alerts at 80%.
