# Specification: phase1-foundation

## Included behavior

The consolidated patch contains exactly:

- durable compact thread attention audit contracts, migration, repository,
  mapper, and projection;
- read-only TWS `v1.2.14` CLI adapter and decoder;
- GitHub Issue / Azure Boards provider-neutral contracts;
- environment-scoped TWS workspace/project/feature/stack-node bindings,
  persistence, and ambiguity-safe locator matching.
- a data-preserving bridge from the original shared 44/45 migration IDs to
  separate upstream and fork migration histories.
- ATT-01 (#3): current approval/input attention, fork migration 46 and a
  separate replayable projector/cursor, without changing the compact audit.

## Dependency model

Hard parents:

- `copilot-cli-provider`

Soft ordering dependency:

- `session-search`

Search and Foundation have disjoint source scopes. Foundation does not consume
the search UI, command or matching implementation; the former hard edge
represented implementation order, not a runtime dependency. The maintainer
approved retaining that order as a soft edge during packaged qualification.

Superseded granular Phase 1 records:

- `durable-thread-attention-ledger`
- `tws-readonly-cli-adapter`
- `hosting-work-item-contracts`
- `tws-identity-bindings`

Superseded historical Copilot children already covered by the Copilot root:

- `copilot-plan-compaction`
- `copilot-skill-discovery`
- `copilot-text-generation`
- `copilot-tool-detail`
- `copilot-turn-timing`

## Acceptance criteria

1. Preserve the four existing foundation capabilities on the current stable
   architecture without replaying granular superseded recipes.
2. Keep upstream migration IDs/names unchanged. New fork history uses its own
   ledger; fresh databases and upstream-only upgrades install the same schema.
3. Recognize exact legacy fork 44/45 history, including the audit-only checkpoint,
   only when its prerequisite ledger and table/key/foreign-key/index schema match.
4. Preserve original fork migration IDs/names/timestamps, attention rows/cursors,
   TWS bindings and native session references. Actually execute missing upstream
   44/45 changes, including collisions beneath an advanced upstream head.
5. Commit history transfer, upstream changes and fork changes atomically.
   Later failures roll back earlier effects; corrected input retries cleanly.
6. Unknown/gapped history, missing schema, conflicting provenance and incomplete
   migration runs fail explicitly rather than masquerading as success.
7. File-backed restart and focused regression tests prove preservation,
   idempotency, rejection and compatibility with the existing upstream migrations.
8. Server/contracts/web/mobile typechecks, scoped lint and integration builds pass.
9. The single-parent landing and regenerated recipe verify on current parents.
10. The superseder is active and healthy, removing granular/covered child
   records from default replay without deleting audit history.
11. No new attention inbox, UI, RPC, relay, push, provider,
   TWS mutation, hosting implementation or target-platform
   behavior is claimed.

## ATT-01 request state

The maintainer approved extending this maintenance root instead of adding an
overlapping independent patch. `current-request-attention` remains
pre-implementation request history, superseded by this work.

- Identity is an opaque digest of thread-creation event, kind, request ID and
  turn ID. Environment scoping remains the authenticated transport boundary.
- Opening creates revision 1. Duplicate/materially unchanged events do not
  change revisions; reason/status changes do. Source metadata identifies the
  last material change, separately from the durable replay cursor.
- Response intent does not resolve. Canonical resolution closes only a
  matching request; failures keep open requests open with `response_failed`.
  Resolved identities cannot reopen after a late failure or duplicate open.
- Turn evidence isolates reused request IDs. Without it, multiple historical
  candidates are ambiguous and ignored with a bounded warning.
- Revert resolves all open requests with one source event. Event IDs are not
  unique across rows. Thread/project deletion purges rows; recreation starts
  a new identity incarnation. Imported requests never become live attention.
- Rebuild derives rows/context from canonical events, not only the audit.
  Runtime duplicates cannot rewind the batched cursor; bootstrap/reset keeps
  the existing explicit single-cursor semantics.
- Reads are bounded to 100 with deterministic keyset paging. No RPC or client
  delivery cursor is introduced. Publication/notifications are not added.
- Preserve old fork/upstream upgrades and audit data. Cover disk reopen,
  projection rollback/retry, duplicates/stale replies, multiple requests,
  import, deletion and rebuild with focused tests.
- All seven providers continue to supply normalized request events. Missing
  capabilities produce no invented requests, provider branches or raw text.
- Completion/failure/disconnect awareness belongs to ATT-02, not this slice.

## External gates

Linux, Windows, and Windows+WSL execution remain documented target-host gates.
The consolidation feature does not alter or waive them.
