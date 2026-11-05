# Feature Request: Honor the adapter selection transition for an immediate same-provider message.dispatch. If the adapter requires a runtime restart, detach only the live replaced session through the existing outbox path before starting the new run, preserve native conversation identity, and retain MCP credentials. Cover direct composer sends as well as separate selection commands; this completes the application-level path for #40 without replacing the earlier routing feature canonical patch.

**Slug**: `provider-direct-dispatch-selection-restart`
**Created**: 2026-11-05T08:15:11Z

## Description

Honor the adapter selection transition for an immediate same-provider message.dispatch. If the adapter requires a runtime restart, detach only the live replaced session through the existing outbox path before starting the new run, preserve native conversation identity, and retain MCP credentials. Cover direct composer sends as well as separate selection commands; this completes the application-level path for #40 without replacing the earlier routing feature canonical patch.
