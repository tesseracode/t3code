# Architecture

T3 Code keeps execution in the environment that owns the workspace. Web, desktop, and mobile
clients control it over authenticated RPC. A remote client must never substitute its own filesystem,
provider credentials, or machine state for the environment's. The desktop app bundles a server,
but its renderer follows the same boundary.

## Ownership boundaries

Provider processes, terminals, Git, and project files belong to the server. Shared connection and
domain state belongs in `packages/client-runtime`; clients supply platform services and UI.
Keeping that logic shared prevents reconnect and multi-environment behavior from diverging between
web and mobile. See [connection runtime](./connection-runtime.md) and
[remote environments](./remote.md).

The [RPC contract](../../packages/contracts/src/rpc.ts) is the boundary between independently
versioned clients and servers. Subscriptions send the state a client needs, so a client viewing one
thread does not pay for every thread's history. Authentication of a socket does not authorize every
method on it. See [environment auth](./environment-auth.md).

### Pull request linking compatibility

Web, desktop, mobile, and environments upgrade independently. Negotiate linking through the
environment descriptor, never through a client version or an assumed coordinated release:

| Environment capability                | Client behavior                                                                                                   |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `threadPullRequests: true`            | Use persisted `pullRequests[]`, multi-link commands, stack UI, and reverse thread lookup.                         |
| Only `threadPullRequestLinking: true` | Use `linkedPullRequest` and the existing `thread.meta.update` single-link operation. Do not call multi-link RPCs. |
| Neither flag                          | Hide linking actions; existing branch-discovered PR display remains available.                                    |

New environments continue advertising the legacy flag, accepting legacy metadata commands, and
emitting the derived `linkedPullRequest` field for older clients. That hostless field includes only
links in the thread project's own repository; cross-host and cross-repository links require the
multi-link protocol. New clients accept snapshots that
omit `pullRequests`. Retain the legacy wire fields, projection column, and replay support; this feature
does not schedule their removal. Missing new capabilities must also override cached multi-link data
after an environment downgrade.

Provider-specific behavior belongs behind an adapter. Orchestration works with normalized commands
and events, so adding a provider should not require branches throughout the domain or clients.
See [provider constraints](./providers.md).

## Settings ownership

Client preferences stay in the current client; environment defaults and project overrides stay
on their owning server. The web and desktop settings target is URL state, resolved against current
connections and project membership. An unavailable target must not fall back to another environment.
**All environments** is an explicit bulk edit of connected, loaded servers, not a durable global
default or a promise to synchronize offline or future environments. Project-group targets similarly
select known environment-local checkouts; the group itself does not store inherited defaults.

## Durable intent and side effects

The event log is the source of truth for orchestration state. The
[engine](../../apps/server/src/orchestration/Layers/OrchestrationEngine.ts) serializes commands;
the [decider](../../apps/server/src/orchestration/decider.ts) produces events without performing
provider or filesystem work. Events, persisted projections, and the accepted command receipt commit
in one database transaction. The in-memory state changes and subscribers receive events after that
commit. This keeps command retries idempotent and prevents a persisted projection from getting
ahead of the event log.

Reactors perform side effects after intent has been recorded, then feed results back through
commands. A command acknowledgement therefore means the intent committed, not that the provider,
checkpoint, or other follow-up work finished. Keep external I/O out of the decider and the database
transaction.

Persisted events must remain decodable on replay. Changing a schema affects old environments at
startup as well as live RPC traffic. Compatibility work must account for stored history, not just
what the newest client sends.

### Fork migration history

Fork migrations use `t3code_fork_migrations`, separate from upstream's
`effect_sql_migrations`; do not allocate new fork IDs in the upstream sequence.
The original foundation used shared IDs 44/45, which upstream later assigned
to different changes. Renumbering the files alone would silently skip the
upstream work because the migrator uses a numeric high-water mark.

[The bridge](../../apps/server/src/persistence/ForkMigrations.ts) accepts only
known history with the expected foundation schema. It preserves original
fork IDs, names and timestamps in the fork ledger and actually executes the
collided upstream migrations before replacing their shared-ledger entries.
The bridge and both migrators share one transaction, including the final
history/schema checks. Unknown, incomplete or conflicting provenance stops
startup rather than adopting whatever tables happen to exist.
Keep this upgrade path when reconciling future releases; never remove old
records just to satisfy a newer manifest. Explicit migration bounds used by
tests build upstream-only fixtures; normal startup also runs fork migrations.

### Current attention and lifecycle awareness

Current approval/input attention is separate from the compact audit. Rebuild
it from persisted orchestration events, not audit rows or the latest thread
shell: independent projector cursors can be at different points during
bootstrap. Its thread context tracks project ownership and creation
incarnations so replay never consults another projection's future state.

Sending a response is intent, not resolution. Canonical resolution closes
the matching request; response failure leaves it open with a bounded reason.
Resolved identities stay closed. Turn-scoped identities distinguish reused
request IDs; an unscoped reply is ignored with a warning when history makes
its target ambiguous. Revert resolves remaining requests; deletion removes
current rows, recreation starts a new incarnation, and imported history never
creates actionable requests.

Accepted provider lifecycle observations travel as an optional, bounded
`lifecycle` field on existing session-set events. The provider boundary retains
the originating turn before the ordinary session snapshot clears it; no prompt,
raw error or command text is copied into awareness. Legacy events without that
evidence remain unknown rather than interpreting any `stopped` status as a
provider disconnect or any `ready` status as a completed turn.

The current projection stores failure/disconnect items separately from request
rows, plus bounded thread counts and an explicit unknown (`null`) phase.
Detail reads merge both item kinds; counts saturate at 999 with an overflow
flag and never replace the detail set. Provider observations are deduplicated
inside the same projection transaction, and older provider timestamps cannot
roll back recovered lifecycle state. Terminal turn tombstones reject late
reopens. Client WebSocket loss does not enter this provider-evidence path.

| Accepted transition | Resolution policy |
|---|---|
| Running for the same provider/turn | Resolve its failure/disconnect as recovered; a different turn leaves older items open |
| Turn completion | Resolve only that turn's callback requests and matching failure/disconnect; create no completion item |
| Turn failure | Close obsolete native callback requests; open/update its static failure item |
| Provider exit/transport loss while that turn is running | Open disconnect and mark stale, unless an explicit stop/interruption was requested |
| Intentional interruption/stop followed by provider exit | Close obsolete callback requests and disconnect, without inventing successful completion or clearing a failure |
| Ready/reconnect without attributable running-turn evidence | Do not resolve an item |
| Revert/delete/recreation | Revert resolves open items; deletion purges state; recreation starts a new incarnation |

Message-mode questions may outlive the originating turn. Preserve them until a
canonical answer/dismissal or explicit revert/delete instead of treating every
question as a native callback. A source event can change multiple items and the
summary; source event IDs therefore are not unique across attention rows.

Fork migration 47 resets only the derived attention state/cursor so the expanded
reducer can replay the durable event stream with its new semantics. Audit and
other projection cursors stay intact. It does not synthesize missing lifecycle
evidence for historical events.

Rows and the internal projection cursor share the existing event/receipt
transaction. Replay emits no notification; future delivery must publish only
after commit with its own delivery cursor. Ordinary streaming events do no
attention lookup beyond the existing batched cursor write.

### Attention synchronization

Servers advertising `capabilities.attentionSync` expose `attention.subscribe`
under `orchestration:read`. One owned RPC stream emits `begin`, keyset `page`
messages, catch-up `delta`s, `sync-complete`, and live `delta`s. The page tokens
chain pages within that subscription; they are not resumable delivery cursors.
The shared reducer lives at `@t3tools/client-runtime/attention-sync`.

Delivery cursors are signed and bound to environment, authenticated session
and scopes, canonical project/thread filters, and delivery generation. They
expire after 24 hours and are usable only while their complete interval remains
available. Malformed or wrong-scope tokens fail explicitly. Revocation and
expiry produce authorization failure; clients must clear inaccessible state.
Filters are selection within an environment-wide authorized read scope, not
an independent authorization mechanism.

Fork migration 48 adds a rebuildable delivery view and a compact change journal.
SQL triggers capture material item/summary changes and removals inside the
same projection transaction. They are derived caches, not another authoritative
event log. The journal retains at most 1000 changes and 8 MiB; ordinary content
deltas neither populate it nor cause delivery queries. Missing capture triggers
make startup fail rather than silently serving stale state.

Subscribe to post-commit domain/reset signals before capturing watermark W in
a short SQL transaction serialized with projection writes. Pages scan the
mutable delivery view by immutable entity key. They are not frozen at W.
After the last page, capture F through the same committed transaction boundary
and replay every compact change in (W,F], including filtered-out watermark
advances. Only then emit `sync-complete(F)`. The journal is written synchronously
with projections, so there is no asynchronous attention-publication backlog
to race at the fence. Live delivery continues strictly above F.

The client stages pages and replay, compares transport versions (including
removal tombstones), and exposes the cache atomically at F. A later incarnation
can supersede a tombstone even when its domain revision restarts at 1. Only live
frames above a completed fence are notification candidates; this protocol
does not deliver notifications or aggregate environments.

Default pages contain 50 rows, maximum 100 combined items/summaries, with a
64 KiB encoded-message bound. Total dataset size is not capped by a page.
Bootstrap/replay expires after 30 seconds; the existing live-stream ACK budget
also bounds delivery. Slow consumers, missing replay intervals, oversized
rows, restart/rebuild generations and incomplete rebuilds produce explicit
reset/backpressure, never a truncated success. A single bounded wake signal
replaces queued raw thread events, and no database transaction spans an RPC ACK.
Consumers own normal reconnect backoff; persistent inability to synchronize
must be surfaced rather than retried in a tight loop.

Startup/bootstrap rotates the delivery generation and gates delivery until
replay completes. Reset clears only derived attention/delivery state and its
cursor; the event history and audit remain authoritative and unchanged.

### Client attention aggregation

`@t3tools/client-runtime/state/attention` provides the shared workspace atom
factory and selectors. Web/desktop and mobile each export one lazy
`attentionWorkspace` from their state layer. Consumers share that instance;
mounting an inbox or badge must not construct another workspace per component.
This slice adds state, not inbox UI or notification delivery.

The workspace observes the existing `EnvironmentRegistry` catalog and runs one
attention subscription on each enabled environment's existing supervisor.
It opens no connections and loads no shell, thread history or repository data.
Environment plus attention ID keys items; `ScopedThreadRef` keys summaries,
thread counts and navigation. Canonical repository grouping is not authority.
Disabling, removing or replacing a target cancels its subscription and evicts
its in-memory attention cache. Enabling it starts a fresh bootstrap.

Each environment owns its protocol cursor, staging map and last complete
snapshot. Partial pages never enter the aggregate. A fresh fence atomically
replaces only that environment; other environments remain usable. Connection
loss retains the complete snapshot as stale and creates no provider-failure
item. Authorization errors or blocked authentication/permission clear it.
Older servers remain explicitly unsupported, not successfully empty.

The aggregate exposes completeness, environment status/reason, open items,
scoped summaries, item and unique-thread totals, and separate live/stale counts.
Totals are complete only when the catalog is ready and every selected enabled
environment is live. Approval, input and failure share the blocking/error tier;
disconnect is warning. Within a tier, sort by oldest opening time, environment,
thread and attention ID. Environment, scoped project/thread, kind and priority
filters use the same count semantics. Counts derive from items, never saturated
summary counters.

Transport failures wait for the supervisor's reconnection. Recoverable stream
resets, server unavailability and premature completion reuse its 3/4/8/16-second
capped retry timings on the same socket. This is failure-driven resubscription,
not polling or a second connection retry loop. A complete cache can resume on
the same RPC session; a replacement session bootstraps afresh because delivery
tokens bind server-side authentication. Protocol/identity faults, oversized
messages and authorization failures stop until connection/session renewal.
Session ownership checks reject late values and configuration from old streams.

Existing relay activity rows lack canonical attention IDs and revisions.
`selectAttentionRelayHints` validates them as a separate advisory collection,
deduplicated by scoped thread and timestamp. Unknown/unscoped hints are rejected;
no hint creates an item, changes a count, or resolves direct state. After an
environment has a complete direct snapshot, even a stale or empty one, its hints
are suppressed. No relay fetcher or changes to upstream Live Activities are
introduced here; mobile presentation/delivery alignment remains separate.

## Turn completion and checkpoints

A turn ending and its follow-up work settling are separate milestones. The
[projector](../../apps/server/src/orchestration/projector.ts) settles the turn from its session
status. A late checkpoint or diff must not extend the recorded turn duration or keep the client
showing provider work as active.

[Checkpoints](../../apps/server/src/checkpointing/CheckpointStore.ts) use hidden Git refs to
capture workspace state without adding commits to the user's branch. A revert must coordinate
workspace state with the provider conversation. A provider that cannot roll back its conversation
must reject that operation before changing the filesystem.

## Waiting for asynchronous work

Tests use [drainable workers](../../packages/shared/src/DrainableWorker.ts) to wait until both the
queue and its current item have finished. An empty queue alone does not prove the worker is idle.

Runtime receipts mark specific test milestones. Their
[production layer](../../apps/server/src/orchestration/Layers/RuntimeReceiptBus.ts) is a no-op;
production behavior must use persisted state and events. These test signals are separate from the
durable command receipts that make dispatch idempotent.

The Electron shell acquires `DesktopPreReadyPlatform.layer` synchronously before asynchronous
services. On Linux this sets the desktop-entry identity and global-shortcut portal flags before
Chromium initializes its portal connection. Setting the identity later in `DesktopAppIdentity`
is too late: Chromium caches the first registration, including failures. The identity must match
the installed entry managed by `DesktopLinuxUrlHandler`. Pre-ready setup also refreshes that entry's
`Exec` path before portal registration: AppImage updates can remove the previous executable, which
makes the old entry invalid even though its filename is correct. The later URL handler avoids
rewriting an identical entry while the portal may be reading it. On Wayland, Electron's synchronous
shortcut-registration result only confirms submission; it does not confirm desktop consent or
an active binding.

Native modules never load in the Electron main process on the startup path, and the two the
snapshot feature keeps are isolated: `@crowecawcaw/xa11y` runs only in forked Node-mode children
(`SnapShotAccessibilityWorker`, `RegionSnapShotWorker`) and a worker thread, and `ffi-rs` loads
lazily inside `WindowsForeground.ts` for a handful of Win32 calls. macOS window lookup shells out
to `osascript` instead of a native addon. A crash or stall in any of these must not take the app
down, so new native capability goes in a child with a deadline, not an `import` in main.

See the [glossary](./glossary.md) for shared terms and the
[development runbook](../operations/development.md) for setup and checks.
