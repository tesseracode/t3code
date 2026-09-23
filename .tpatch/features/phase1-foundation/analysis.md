# Analysis: phase1-foundation

## Summary

Port the previously consolidated local-first foundation onto stable v0.0.42
after the verified Copilot and search roots. The retained capabilities are
the compact attention audit, read-only TWS adapter, opaque TWS bindings and
GitHub/Azure work-item contracts.

The original fork used upstream migration IDs 44/45. Stable upstream now
uses those IDs for different changes. Its numeric high-water migrator would
silently skip those upstream operations on a legacy fork database.

Move fork migration ownership to `t3code_fork_migrations`. Preserve verified
legacy records and their timestamps there, execute the collided upstream
operations, and record their real completion in the upstream ledger. The bridge,
upstream migration stream and fork stream share one transaction. Unknown
history, missing schema and false concurrent-lock success are rejected.

## Compatibility

- Current Effect uses `Schema.TaggedError`; retain the same typed error behavior.
- Preserve upstream projection additions and reuse the shared request-ID
  normalizer at all current call sites.
- Existing fork rows, opaque identities, projection cursors and native session
  references survive upgrade. Fresh/upstream installs create the same foundation.
- The return shape of `runMigrations` remains upstream migration tuples; fork
  execution has a separate history and is logged only after transaction commit.
- Phase 0 Copilot and search remain hard parents.
- Granular Phase 1 features remain available as review/provenance records but
  are superseded for future replay.
- Five historical Copilot child records are also superseded because their
  accepted behavior is already provided by the hard-parent Copilot root.

## Recommendation

Record and land the current semantic port, regenerate its recipe and capture
current parent-generation snapshots. Tpatch 0.16 refused the initial reconcile
at its stale-parent-generation gate; preserve that refusal as evidence rather
than changing archived manifests or disabling dependency validation. The manual
port and real record operation establish the new generation.
