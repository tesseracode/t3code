# Environment-local foundation projections

Foundation consumes committed V2 orchestration, not the retired V1 engine.
`EventSink` projects attention in the event/projection transaction and publishes
the application event only after commit. `FoundationProjection` owns a separate
cursor and compact provider/node ownership references. Ordinary content deltas
do not perform attention SQL work.

The immutable compact audit is separate from mutable current requests and
lifecycle awareness. Request identities include the V2 creation event, request
kind, request ID and owning V2 run. The compatibility wire field `turnId` on
current attention items, awareness summaries and their lifecycle evidence means
the owning V2 `runId`, never a `providerTurnId`. Provider-turn events use their
explicit root-node run ownership; requests without known node run ownership
keep a null value, and unattributed root lifecycle events create no live item.
The immutable audit and canonical source events retain their original
source/native-turn identities; this mapping does not rewrite historical IDs.
Only authoritative V2 run termination closes callbacks and terminally fences
run-scoped attention. A root provider turn completing, failing or stopping does
not terminate its owning run: goal continuation and retries can start another
root native turn within that same run. Those native lifecycle events remain in
the immutable canonical event history. Provider liveness can recover a live
run's disconnect, but cannot reopen a terminated run; an accepted run retry or
running transition is authoritative recovery.
A response intent is not confirmation:
live responses record pending delivery, then a worker receipt confirms or
records a failed delivery. Canonical provider resolution and turn termination
also close matching callbacks. Message-mode questions survive turn completion.
Provider-native child activity is not attributed to an unrelated root turn.

Attention synchronization owns bootstrap, journal replay, and live delivery in
one authenticated stream. Existing application-event ownership supplies
post-commit wakeups. Signed delivery/page tokens bind the environment, session,
scopes, filter and generation. The derived journal retains at most 1,000 changes
or 8 MiB; frames and pages are bounded. Clients keep incomplete snapshots
private, scope identities per environment, and discard notification candidates
when authority or freshness is lost. No inbox or OS-notification policy lives
in this root.

Upstream migrations keep their original ledger and names. Fork migrations use
`t3code_fork_migrations`; the exact legacy shared-ledger 44/45 bridge validates
prerequisites, table keys, ownership foreign keys and indexes before transferring
provenance. Both migrators, collision repairs and completion checks share one
transaction. Migration 50 resets only V1-derived live attention/context and
introduces the V2 cursor/ownership references. Audit, opaque TWS bindings, and
provider runtime references remain intact. Legacy projection cursors are
archived before upstream drops their old table.

The upstream `state.sqlite` to `statev2.sqlite` copy remains the recovery
boundary: the original is never migrated by the new runtime. Transcript import
and fresh native provider sessions follow upstream V2 behavior; this root does
not promise complete native-session migration.

TWS is optional, off by default, environment-owned, and read-only. Its V2 thread
and project incarnation queries retain explicit choices only while their
identity remains valid. Missing CLI support preserves last-known topology as
unavailable/stale; a path-derived registry stable ID never establishes workspace
identity. See [TWS context](tws-context.md) for matching and freshness rules.
