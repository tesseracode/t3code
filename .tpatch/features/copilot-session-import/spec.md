# Copilot session import

Tracking: #33. Target: current validated main. This is a candidate, not promotion.

## Modes and ownership

- Import an explicit bounded, text-only snapshot from configured enabled Copilot
  homes through the existing project import workflow. Reading never creates or
  resumes a native session and never runs hooks, tools, approvals or inference.
- Snapshots are read-only on the server and all clients, including after reload,
  reconnect, metadata edits and attempted provider switches. They do not acquire
  native ownership. Record original provider instance, native ID and snapshot
  provenance separately from a resumable provider thread.
- Refuse live-owner attachment and uncertain ownership. New conversations from
  history, refreshable mirrors and fenced live-owner handoff are deferred.
- Native continuation remains blocked: a disposable two-runtime SDK 1.0.28
  probe observed `checkInUse` reporting the first owner while `resumeSession`
  nevertheless succeeded with `alreadyInUse: true`. There is no verified atomic
  exclusive admission contract. Do not equate lock absence or a shutdown event
  with confirmed release, or silently reconstruct a new conversation.

## Acceptance

1. Discover sessions only in enabled provider-instance homes, using the same home
   precedence as the adapter. Symlink aliases must not conflate accounts or
   escape the configured session-state root. Recheck canonical containment and
   discovered file identity at import open and completion; changed candidates
   require a fresh scan. Keep bounded discovery and reads.
2. Recognize current root Copilot journal events, preserving visible user and
   assistant text, order, timestamps, journal-provided title and selected model.
   Derive a title from the first prompt when a native rename is absent from the
   journal; workspace sidecar title recovery is not supported. Exclude child
   messages, ephemeral fragments, tool payloads and uncommitted Fusion drafts.
   Validate persisted predecessor chains before hiding child events, and require
   valid timestamps and known message content. Preserve selected models from
   start/resume/model-change events, not assistant execution attribution, and
   clear a durable model deselection rather than retaining a withdrawn model.
   Reject malformed/unsupported journals rather than presenting them as complete.
3. Keep the existing recent-history bounds and identify the result as partial
   text history: tool activity, attachments and possibly older messages are not
   included. No claim of complete native history.
4. Repeat imports never duplicate messages or threads or refresh a prior
   snapshot in place. Distinct storage homes with identical session IDs remain
   distinct. Existing T3-owned native sessions must not be resumed by import.
5. Read-only snapshots remain visible with retained native provenance and an
   explanation that continuation is unavailable. Reject provider operations,
   forks and context merges at the server; permit ordinary viewing, renaming,
   organization and deletion. No client-only safety guard.
6. Preserve existing Claude/Codex imports. Validate focused parser/scanner,
   importer and orchestration behavior plus affected-package checks.
7. Exercise isolated web and iOS snapshot viewing. Explicitly record missing
   mobile import entry points, native shell/receiving-platform checks and blocked
   continuation rather than claiming full provider parity.
8. Record a scoped canonical patch and matching recipe, exact replay/mode proof,
   independent review and honest verifier result before a scoped branch push.
   Leave #33 open until native-continuation safety is resolved.
