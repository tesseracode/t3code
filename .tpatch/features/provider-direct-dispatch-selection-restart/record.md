# Implementation Record: provider-direct-dispatch-selection-restart

**Recorded**: 2026-11-05T08:23:46Z
**Files changed**: 2
**Patch size**: 9132 bytes
**Capture mode**: working-tree-all
**Pathspecs**: apps/server/src/orchestration-v2/Orchestrator.ts,apps/server/src/orchestration-v2/SelectionRestart.integration.test.ts

## Change Summary

```
 apps/server/src/orchestration-v2/Orchestrator.ts   | 130 +++++++++++++--------
 .../SelectionRestart.integration.test.ts           |  31 ++---
 2 files changed, 99 insertions(+), 62 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: apps/server/src/orchestration-v2/Orchestrator.ts, apps/server/src/orchestration-v2/SelectionRestart.integration.test.ts
- **claim_ids**: (none)
- **base_commit**: `30fad02f12291b5383ae1403a19e1c7adb881b5f`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/provider-direct-dispatch-selection-restart/artifacts/post-apply.patch
```

