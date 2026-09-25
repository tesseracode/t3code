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
11. No new attention inbox/current reducer, UI, RPC, relay, push, provider,
   TWS mutation, hosting implementation or target-platform
   behavior is claimed.

## External gates

Linux, Windows, and Windows+WSL execution remain documented target-host gates.
The consolidation feature does not alter or waive them.
