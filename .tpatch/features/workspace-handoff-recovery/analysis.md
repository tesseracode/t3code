# Workspace handoff recovery

Tracking: #42. Baseline: validated main, not the installed November 3 preview.

An exclusive provider session's last-thread detach calls `releaseEntry` with
`manual_shutdown` and the detached thread identity. Release currently signals
`ProviderAdapterEventStreamError`, the same path used for genuine stream failure.
Run ingestion then marks the application run failed. Ordinary same-provider
queue protection correctly holds its successor, but that strands the worktree
handoff's deliberately queued continuation.

Keep genuine failure protection unchanged. Distinguish an intentional detach
from an unusable provider stream with a typed internal signal, scoped to its
session and thread, and finalize that interrupted execution without a failure
item. Preserve provider interruption, finalization fences and session shutdown.
Pooled-provider detach, server shutdown and direct close retain their contracts.

The later generic Stop/retry failure has no established root cause. This patch
does not claim to fix it or change external Copilot ownership admission.
