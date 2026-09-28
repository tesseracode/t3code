# Exploration: phase1-foundation on stable v0.0.42

## ATT-01 extension

Issue #3 adds `RequestAttentionItem` contracts, fork migration 46 and the
`ProjectionThreadAttentionCurrentRepository` participant. It shares the
existing pipeline transaction/cursor machinery, with no new publication path.
The maintainer chose this root because both the migration registry and
projection pipeline are already Foundation-owned.

The current projector replays a small private thread-incarnation context
instead of reading a different projector's final state during catch-up.
Request identity is a deterministic hash of incarnation/kind/request/turn.
Resolved candidates remain in lookup history so an unscoped late reply cannot
resolve a newer request reusing the same provider ID. Source event identity
is deliberately nonunique across rows updated by one revert.

Normal runtime cursor batches are monotonic; explicit single-projector
bootstrap/reset semantics are retained. The legacy migration bridge recognizes
only its real historical 44/45 collisions, not every future fork ID.
Current-state reset and rebuild leave audit data and cursor unchanged.

Focused proof lives in `CurrentRequestAttention.test.ts`, `attention.test.ts`
and the existing migration/pipeline/engine suites. Coverage includes material
idempotence, request/kind/thread/turn isolation, ambiguous late replies,
one-event/multiple-row resolution, project deletion, recreation, import,
transaction rollback/retry, disk reopen and independent-cursor catch-up.
ATT-01 added no frontend, RPC or lifecycle-awareness behavior.

## ATT-02 extension

Reuse `ProviderRuntimeIngestion`'s existing accepted-lifecycle guard. Preserve a
small typed evidence object before terminal events clear the session turn ID;
the decider carries it to persisted `thread.session-set`. Client commands cannot
submit this server-only command. The new mapper uses canonical events, not
provider-specific strings or raw reason/error text.

| Provider adapter | Existing normalized signals consumed |
|---|---|
| Codex | turn.started/completed, runtime.error, session lifecycle |
| Claude | turn.completed/aborted, runtime.error, graceful session exit |
| Cursor | ACP turn completion and normalized session exit |
| Grok | normalized turn completion/failure and session exit |
| OpenCode | turn completion/failure, runtime.error and session exit |
| Antigravity | ACP turn completion and normalized session exit |
| Copilot | SDK-derived turn completion, runtime.error and context exit |

Absent signals and turnless legacy events stay unknown. The shared phase type
is reused, but existing relay/client projection behavior is not replaced here.

Extend the current projector rather than reading another projection's final
state during replay. Failure/disconnect rows, thread summaries, lifecycle
tombstones and provider-observation deduplication all share its transaction
and cursor. Repeated provider events cannot reopen a recovered item. Summary
count queries read at most 1000 rows per kind, and only material visible changes
increment summary revisions. Ordinary content deltas still bypass this work.

Preserve upstream message-mode questions across completion. Migration 47 adds
the private request resolution policy and rebuilds only derived attention from
the event store; original migration 46 bytes and the immutable audit are retained.
The migration tests verify rollback before ledger commit and idempotent reruns.

## Target and retained seams

- Stable target: `719a76ca1dbf5490f1aa33ffb9966301e02be9a9`.
- Integrated base before this port: `7b5f4af3501d89b42b840f875917c09db4f786ce`.
- Retain audit mapper/repository and its independent projector alongside current
  pull-request, approval, user-input and attachment projection behavior.
- Retain the bounded public TWS adapter and ambiguity-safe opaque binding
  contracts/repository. Adapt removed Effect API names, not TWS version/schema.
- Retain GitHub/Azure work-item types and optional capability declaration;
  do not advertise an implemented work-item service.

## Migration boundary

`Migrations.ts` keeps the exact upstream manifest through 52. The existing
Effect Migrator skips all IDs at or below the recorded head, irrespective
of their names, and treats insert constraint failures as concurrent locking.

`ForkMigrations.ts` validates known histories and expected foundation schema
before adopting legacy 44/45 records. The original migration effects live
under `ForkMigrations/`, not the upstream numbered directory. Fresh table
creation is strict; pre-existing unrecorded tables are not silently adopted.

Use the existing SQL transaction facility around the bridge and both migrators.
For an accepted collision, preserve the original ID/name/timestamp in the fork
ledger, remove only that verified shared-ledger collision, execute the actual
upstream operation and insert its completion record. Never relabel an operation
that did not run. Verify required history after the generic migrator returns so
a constraint failure cannot be mistaken for a completed startup.

Partial migration targets are upstream-only test fixture construction; bounds
below an existing collision are refused. Normal startup runs both streams.
Unknown future history is a compatibility error, not permission to downgrade.
Concurrency failures remain explicit SQL/migration errors; no retry polling is
introduced. Success logging occurs after the outer commit.

## Proof and lifecycle

Disposable memory/file databases cover fresh install, current upstream upgrade,
legacy audit-only and full foundation, advanced mixed history, matching-column
foreign-key damage, missing schema/history, provenance conflicts, rejected ledger
inserts, late migration failure, retry and reopen. Preserved rows include two
environments sharing local binding IDs and an archived node without a worktree.
Run existing upstream migration and projection tests as the regression boundary.

The initial tpatch reconcile is refused by its stale hard-parent generation
snapshot gate. Do not edit old generation evidence to pretend it was current.
Port manually, capture current source/parents with `record --regenerate-recipe`,
then land and verify. Historical granular features remain audit-only. No live
database, browser, inference provider or target-host package is used for this port.
