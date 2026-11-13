# Workspace handoff recovery

1. A persisted workspace change detaching an active exclusive provider ends the
   old run as interrupted, not failed. Its queued same-provider continuation
   starts exactly once using the new workspace and original native thread.
2. Intentional detach is a typed internal signal fenced to the same provider
   session and app thread. Do not infer it from human-readable error messages.
3. Genuine event-stream failures still produce failed runs and hold ordinary
   queued messages. No automatic resend, native replacement or global unhold.
4. Preserve shared-session attachments, stable MCP credentials for handoff,
   server-shutdown recovery and stale-attempt finalization guards.
5. Prove behavior with persisted integration fixtures and focused affected
   checks. Record the patch and deterministic recipe before a scoped landing.
6. No live-session recovery, installed-app replacement, deployment or claim that
   the distinct generic Stop/retry incident is resolved.
