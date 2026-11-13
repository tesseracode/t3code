# Implementation Record: workspace-handoff-recovery

**Recorded**: 2026-11-13T05:47:20Z
**Files changed**: 10
**Patch size**: 36631 bytes
**Capture mode**: working-tree-all
**Pathspecs**: apps/server/src/orchestration-v2/ProviderSessionManager.test.ts,apps/server/src/orchestration-v2/ProviderSessionManager.ts,apps/server/src/orchestration-v2/ProviderTurnStartService.test.ts,apps/server/src/orchestration-v2/ProviderTurnStartService.ts,apps/server/src/orchestration-v2/RunExecutionService.test.ts,apps/server/src/orchestration-v2/RunExecutionService.ts,apps/server/src/orchestration-v2/SelectionRestart.integration.test.ts,docs/internals/providers.md,docs/user/source-control.md,packages/provider-core/src/server/ProviderAdapter.ts

## Change Summary

```
 .../ProviderSessionManager.test.ts                 | 128 ++++++++++------
 .../src/orchestration-v2/ProviderSessionManager.ts |  19 ++-
 .../ProviderTurnStartService.test.ts               |  88 ++++++-----
 .../orchestration-v2/ProviderTurnStartService.ts   |   8 +-
 .../orchestration-v2/RunExecutionService.test.ts   | 120 +++++++++++++++
 .../src/orchestration-v2/RunExecutionService.ts    |  46 ++++--
 .../SelectionRestart.integration.test.ts           | 166 +++++++++++++++++++++
 docs/internals/providers.md                        |  12 ++
 docs/user/source-control.md                        |   9 ++
 .../provider-core/src/server/ProviderAdapter.ts    |  11 ++
 10 files changed, 499 insertions(+), 108 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: apps/server/src/orchestration-v2/ProviderSessionManager.test.ts, apps/server/src/orchestration-v2/ProviderSessionManager.ts, apps/server/src/orchestration-v2/ProviderTurnStartService.test.ts, apps/server/src/orchestration-v2/ProviderTurnStartService.ts, apps/server/src/orchestration-v2/RunExecutionService.test.ts, apps/server/src/orchestration-v2/RunExecutionService.ts, apps/server/src/orchestration-v2/SelectionRestart.integration.test.ts, docs/internals/providers.md, docs/user/source-control.md, packages/provider-core/src/server/ProviderAdapter.ts
- **claim_ids**: (none)
- **base_commit**: `0490e7bb2753ee455d58f9832f6ea943af81b0e0`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/workspace-handoff-recovery/artifacts/post-apply.patch
```

