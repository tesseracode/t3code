# Optional environment-owned TWS context

`twsIntegrationEnabled` is an environment-level server setting, false by
default. The runtime is an optional sidecar to orchestration, not a provider
or a plugin loader. Disabling cancels the owned scan, invalidates its generation
and hides cached TWS results without discarding choices or affecting ordinary
projects, threads, provider sessions or notification state.

The source boundary uses only the pinned public v1.2.14 CLI. Every refresh
re-probes the version; registry checks and status/stack reports retain the
adapter's timeout and byte limits. `TwsTopology` validates the narrow association
fields and count/parent consistency rather than treating raw report arrays as
safe topology. Cross-repository unsupported observations remain non-executable.
No `.tws` backing file, tmux internals, provider process state or remote
client-supplied filesystem path is used as association authority.

The public report's `stable_id` is path-derived, not move-stable. Registry
marker identity is the persistent workspace proof. See the pinned
[workspace identity implementation](https://github.com/jdbencardinop/tesseraworkspaces/blob/v1.2.14/internal/workspace.go#L68-L83).
Feature and node identity use exact parent-scoped logical keys, never label
similarity, branch-only matching or repository grouping. Conflicting markers
create a distinct binding requiring confirmation, never a weaker-locator merge.
An unchanged thread location with a newly named source cannot silently rewrite
its existing automatic feature choice.

Fork migration 49 adds observation, compact topology and context records beside
the existing opaque binding tables. A partial creation-event index makes
thread/project incarnation checks independent of conversation length.
Context writes compare material revision, incarnation and server-owned location.
Automatic refresh reuses the latest stored choice within its commit transaction,
so it cannot undo a concurrent explicit clear. Fresh observations change evidence,
not material revisions. Projection rebuilds do not erase sidecar choices.

One environment-owned scan and one queued invalidation coalesce clients and
execution changes. CLI work occurs outside SQLite transactions. A generation
guard and re-read of project/thread metadata reject stale completion. Scan
cancellation settles every waiting receipt and cannot cancel another client's
connection or a provider process.

Completeness is per workspace/feature. Independently complete positives survive
partial scans; incomplete scopes preserve last-known data and never manufacture
negative evidence. Missing entities record at most two distinct complete
observation IDs for later consumers. Age alone does not revoke anything.
The old binding repository's row limits are not enumeration or absence proof.

`tws.refresh`, `tws.query`, `tws.contexts.get`, `tws.context.set` and
`tws.provenance` use the existing authenticated environment RPC group.
Reads/refresh use orchestration-read; explicit changes use orchestration-operate.
The server chooses environment identity. Query pages contain at most 100 compact
rows and a 60 KiB entry budget; a changed observation ID means pages may not be
combined as one complete observation. Project membership lists signal overflow.
Full locator paths are available only through a single-binding provenance read,
never aggregate shell rows.

Shared client-runtime commands and query atoms reuse environment leases.
Web/desktop configuration refreshes on an enabled view/reconnect; mobile has
the same contract/state exports for later presentation. There is no grouping,
tag or provider-state inference in this slice.
