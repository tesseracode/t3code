# Exploration: phase1-foundation on stable v0.0.42

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
