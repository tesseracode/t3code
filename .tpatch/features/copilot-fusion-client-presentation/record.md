# Implementation Record: copilot-fusion-client-presentation

**Recorded**: 2026-11-03T19:24:47Z
**Files changed**: 19
**Patch size**: 52557 bytes
**Capture mode**: working-tree-all

## Change Summary

```
 .tpatch/FEATURES.md                                |   1 +
 .../orchestration-v2/TurnItemPositionStore.test.ts |  25 +-
 .../src/orchestration-v2/TurnItemPositionStore.ts  |  21 +-
 docs/user/activity-log.md                          |  11 +-
 docs/user/providers-copilot.md                     |  16 ++
 .../src/work-log/modelExecution.test.ts            |  20 ++
 .../client-runtime/src/work-log/modelExecution.ts  |  17 +-
 packages/contracts/src/model.ts                    |   2 +
 packages/contracts/src/orchestrationV2.ts          |   1 +
 .../provider-copilot/src/server/adapter.test.ts    | 269 ++++++++++++++++++++-
 packages/provider-copilot/src/server/adapter.ts    | 148 +++++++++---
 packages/provider-copilot/src/server/client.ts     |  16 +-
 .../provider-copilot/src/server/routing.test.ts    |  27 ++-
 packages/provider-copilot/src/server/routing.ts    |  27 ++-
 .../provider-copilot/src/server/status.test.ts     |  29 +++
 packages/provider-copilot/src/server/status.ts     |   5 +-
 packages/provider-copilot/src/settings.ts          |  11 +-
 packages/shared/src/model.test.ts                  |  34 +++
 packages/shared/src/model.ts                       |  28 ++-
 19 files changed, 641 insertions(+), 67 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: (none)
- **claim_ids**: (none)
- **base_commit**: `c715f234138b5f7af0e825cd67f2f0deb7a790b0`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-fusion-client-presentation/artifacts/post-apply.patch
```

