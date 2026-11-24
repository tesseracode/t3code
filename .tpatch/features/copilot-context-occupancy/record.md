# Implementation Record: copilot-context-occupancy

**Recorded**: 2026-11-05T07:54:15Z
**Files changed**: 4
**Patch size**: 14937 bytes
**Capture mode**: working-tree-all
**Pathspecs**: packages/provider-core/src/server/ProviderAdapter.ts,packages/provider-copilot/src/server/adapter.ts,apps/server/src/orchestration-v2/ProviderTurnStartService.ts,apps/server/src/orchestration-v2/testkit/ProviderSwitch.integration.test.ts

## Change Summary

```
 .../orchestration-v2/ProviderTurnStartService.ts   |   9 +-
 .../testkit/ProviderSwitch.integration.test.ts     | 115 +++++++++++++++++++--
 packages/provider-copilot/src/server/adapter.ts    |   2 +
 .../provider-core/src/server/ProviderAdapter.ts    |   4 +
 4 files changed, 121 insertions(+), 9 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: packages/provider-core/src/server/ProviderAdapter.ts, packages/provider-copilot/src/server/adapter.ts, apps/server/src/orchestration-v2/ProviderTurnStartService.ts, apps/server/src/orchestration-v2/testkit/ProviderSwitch.integration.test.ts
- **claim_ids**: (none)
- **base_commit**: `f03693d6a4b53e4fc16278203a247ccf946b6bef`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-context-occupancy/artifacts/post-apply.patch
```

