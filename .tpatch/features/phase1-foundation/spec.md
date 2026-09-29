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
- ATT-02 (#4): authoritative lifecycle evidence, failure/disconnect attention
  and bounded thread awareness through fork migration 47.
- ATT-03 (#5): an authenticated owned attention bootstrap/replay/live stream,
  bounded derived delivery journal and shared client protocol reducer.
- ATT-04 (#6): shared scoped multi-environment attention aggregation through
  existing connection ownership, without inbox UI or notification delivery.

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
11. No new attention inbox, UI, relay, push, provider,
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
- ATT-01 itself does not infer completion/failure/disconnect; ATT-02 below
  handles those transitions through explicit provider evidence.

## ATT-02 awareness and lifecycle

The maintainer approved conservative, turn-scoped lifecycle authority and
saturated counts with an overflow flag.

- Preserve accepted normalized provider event identity, provider instance,
  turn and bounded transition on the existing server-only session-set command
  and persisted event. No new client RPC, raw error or prompt field.
- All seven provider mappings share this boundary: Codex, Claude, Cursor,
  Grok, OpenCode, Antigravity and Copilot. Do not invent observations when a
  provider emits none; legacy session statuses alone remain unknown.
- Phases are starting/running/waiting-for-approval/waiting-for-input/
  completed/failed/stale, with null for insufficient evidence. Summaries
  carry four counts capped at 999, an overflow flag and material revision,
  not an attention-ID array. Counts do not cap paginated details.
- Completion creates no unresolved item and affects only its turn. Preserve
  message-mode questions that remain answerable after provider completion.
- Failure/disconnect identity includes the thread incarnation, provider,
  turn, kind and opening source event. Repeated material state is idempotent.
  Deduplicate originating provider observations even across separate persisted
  events, and ignore delayed pre-recovery observations.
- Resolve failure/disconnect on accepted same-provider/same-turn running
  recovery or completion; unrelated turns and seen/ack state never clear them.
  Ready alone is not recovery. Historical terminal turns reject late reopen.
- Provider exit or transport error opens disconnect only while the attributed
  turn is active. Explicit stop/interruption is not unexpected loss.
  Frontend connection loss is never server-owned attention.
- Explicit interruption closes matching callback/disconnect items but not
  failure items; revert resolves all open items, deletion purges them, and
  recreation cannot revive the prior incarnation.
- Migration 47 resets only derived attention and its cursor for deterministic
  bootstrap. Legacy shared-ledger, upstream-only and ATT-01 upgrades remain
  atomic and preserve audit/history. Failure rolls back schema and reset.
- Tests cover the ingestion/decider/projector path, all provider mappings,
  scope/recovery, callback versus message-mode questions, duplicates, late
  events, overflow, disk reopen, rebuild, deletion and transactional rollback.
- Preserve post-commit engine publication and no attention notifications.
  Inbox, relay, snapshot subscriptions and client UI remain later issues.

The complete transition/resolution table is maintained in
`docs/internals/overview.md#current-attention-and-lifecycle-awareness`.

## ATT-03 bounded synchronization

The maintainer approved one owned backpressured stream rather than independently
callable snapshot/stream RPCs, and a bounded derived journal rather than a new
authoritative event history.

- `attention.subscribe` uses environment orchestration-read authority and an
  optional discovery capability. Tokens bind environment, session/scopes,
  normalized filters and delivery generation. Page and delivery tokens are
  distinct; page tokens only chain pages within the owned stream.
- Register post-commit/reset wakeups before short transaction capture W.
  Immutable-key pages are a mutable bootstrap scan. After the final page,
  capture committed F, replay all journal changes (W,F], then sync-complete F.
- SQL triggers capture material changes/removals transactionally. Item
  incarnation/tombstone transport versions override overlapping older pages.
  Filter exits/removals are explicit; empty filtered batches advance cursors.
- Pages/messages default to50, cap at100 combined entries and64KiB; no dataset
  cap. Journal retention is1000 changes/8MiB; bootstrap/replay expires at30s.
  Use existing ACK-aware live budgeting and a single sliding wake signal.
- Reconnect requires the complete contiguous interval; generation/retention/
  size/time failures explicitly reset. Malformed/scope-mismatched cursors
  fail; revoked authority discards client cache. No polling/reset loops.
- Rebuild rotates generation, gates reads during replay and preserves the
  immutable event/audit history. Missing journal triggers are a startup error.
- Shared client reducer stages until the fence, rejects gaps/wrong scope,
  handles overlap and deletion/recreation, and suppresses notification
  candidates during bootstrap/resumed replay.
- Cover real engine commit barriers, >100 items and summaries, inserts behind
  the keyset, final-page/fence commits, filtered changes, rollback, restart,
  rebuild, token kind/scope changes, slow overflow and UTF-8 byte limits.
- Existing web/desktop/mobile transports use the common RPC contracts. No UI,
  environment aggregation, notification preferences or mandatory relay here.

## ATT-04 shared environment aggregation

The maintainer approved retaining stale rows with separate live/stale counts,
discarding disabled caches, advisory-only relay hints and capped reset backoff.

- One lazy workspace instance per client observes the existing registry and
  owns one subscription/cache per enabled environment on its existing supervisor.
  No sockets, replacement registry, full thread loads or repository grouping.
- Scope items by environment/attention ID; reuse ScopedThreadRef for thread
  identity, summaries, filters and navigation. Count unique actionable threads
  separately from items, deriving counts from items rather than saturated summaries.
- Loading, syncing, live, stale, unauthorized, unsupported and error remain
  explicit. Completeness requires a ready catalog and all selected enabled
  environments live. Pages/replay stay staged; a completed fence replaces only
  its environment, preserving the last complete snapshot as stale meanwhile.
- Approval/input/failure share the blocking-error priority; disconnect is warning.
  Sort oldest first, then environment/thread/attention ID. Scoped filters apply
  before counting. Disconnection creates no canonical failure.
- Remove/disable/replace cancels and evicts the environment. Lost authorization
  clears inaccessible state. Ignore late old-session frames/configuration.
- Reuse the connection supervisor's 3/4/8/16-second capped delays for recoverable
  stream failures without reconnecting a healthy socket. Transport loss waits
  for its supervisor. Only complete same-session caches resume; changed RPC
  sessions bootstrap because cursor authentication identity cannot be inferred.
  Authorization/protocol/oversize faults stop until connection/session renewal.
- Relay rows have no canonical attention identity/revision. Validate scoped
  hints separately, never count or promote them, and suppress hints after a
  complete direct snapshot, including empty/stale snapshots and deleted items.
- Tests cover collisions, partial bootstraps, atomic reconnect, stale counts,
  sorting/scoped filtering, removal/disable/replacement, authorization, reset
  delays, unsupported capability, late frames/config and direct/relay disagreement.
- Shared lazy exports serve web/local/hosted, desktop via web and mobile.
  Existing direct/bearer/SSH/relay/tunnel connection ownership is unchanged;
  provider-independent canonical data needs no adapter changes.

## External gates

Linux, Windows, and Windows+WSL execution remain documented target-host gates.
The consolidation feature does not alter or waive them.
