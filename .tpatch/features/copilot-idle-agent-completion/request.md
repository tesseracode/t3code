# Feature Request: Fix Copilot idle reusable helpers incorrectly keeping completed threads in Waiting. A returned idle helper must not hold parent completion; retain agent reuse, real running-child work, approvals, input requests, command/background-service semantics, and reconnect correctness across shared web/desktop/mobile execution presentation. Track a separate scoped fix; no live database edits or deployment.

**Slug**: `copilot-idle-agent-completion`
**Created**: 2026-11-02T21:41:24Z

## Description

Fix Copilot idle reusable helpers incorrectly keeping completed threads in Waiting. A returned idle helper must not hold parent completion; retain agent reuse, real running-child work, approvals, input requests, command/background-service semantics, and reconnect correctness across shared web/desktop/mobile execution presentation. Track a separate scoped fix; no live database edits or deployment.

## Tracking

https://github.com/tesseracode/t3code/issues/35

The v0.1.4 provider adapter publishes native idle agents as pending background
work even after a result is available and the owning run has completed. Shared
execution presentation then holds completion and displays a misleading waiting
banner/sidebar state. Preserve reusable agent lifetime separately from
outstanding request lifetime; do not cancel helpers or edit live projections.
