# Implementation Record: copilot-fusion-model-selection

**Recorded**: 2026-11-24T07:15:50Z
**Files changed**: 32
**Patch size**: 124105 bytes
**Capture mode**: staged-index
**Pathspecs**: apps/mobile/src/features/threads/ThreadSettingsRows.shared.tsx,apps/mobile/src/features/threads/ThreadSettingsSheet.tsx,apps/mobile/src/features/threads/thread-settings-options.test.ts,apps/mobile/src/lib/providerOptions.ts,apps/mobile/src/lib/threadActivity.ts,apps/server/src/orchestration-v2/ProviderEventIngestor.test.ts,apps/server/src/orchestration-v2/ProviderEventIngestor.ts,apps/server/src/orchestration-v2/RunExecutionService.ts,apps/web/src/components/chat/TimelineWorkEntryRow.tsx,apps/web/src/components/chat/TraitsPicker.tsx,apps/web/src/session-logic.ts,docs/user/activity-log.md,docs/user/providers-copilot.md,packages/client-runtime/package.json,packages/client-runtime/src/modelTraits.ts,packages/client-runtime/src/work-log/itemDetail.test.ts,packages/client-runtime/src/work-log/itemDetail.ts,packages/client-runtime/src/work-log/modelExecution.test.ts,packages/client-runtime/src/work-log/modelExecution.ts,packages/contracts/src/model.ts,packages/contracts/src/orchestrationV2.test.ts,packages/contracts/src/orchestrationV2.ts,packages/provider-copilot/src/server/adapter.test.ts,packages/provider-copilot/src/server/adapter.ts,packages/provider-copilot/src/server/fusion.test.ts,packages/provider-copilot/src/server/fusion.ts,packages/provider-copilot/src/server/routing.test.ts,packages/provider-copilot/src/server/routing.ts,packages/provider-copilot/src/server/status.test.ts,packages/provider-copilot/src/server/status.ts,packages/shared/src/model.test.ts,packages/shared/src/model.ts

## Capture Provenance

- **capture_mode**: `staged-index`
- **pathspecs**: apps/mobile/src/features/threads/ThreadSettingsRows.shared.tsx, apps/mobile/src/features/threads/ThreadSettingsSheet.tsx, apps/mobile/src/features/threads/thread-settings-options.test.ts, apps/mobile/src/lib/providerOptions.ts, apps/mobile/src/lib/threadActivity.ts, apps/server/src/orchestration-v2/ProviderEventIngestor.test.ts, apps/server/src/orchestration-v2/ProviderEventIngestor.ts, apps/server/src/orchestration-v2/RunExecutionService.ts, apps/web/src/components/chat/TimelineWorkEntryRow.tsx, apps/web/src/components/chat/TraitsPicker.tsx, apps/web/src/session-logic.ts, docs/user/activity-log.md, docs/user/providers-copilot.md, packages/client-runtime/package.json, packages/client-runtime/src/modelTraits.ts, packages/client-runtime/src/work-log/itemDetail.test.ts, packages/client-runtime/src/work-log/itemDetail.ts, packages/client-runtime/src/work-log/modelExecution.test.ts, packages/client-runtime/src/work-log/modelExecution.ts, packages/contracts/src/model.ts, packages/contracts/src/orchestrationV2.test.ts, packages/contracts/src/orchestrationV2.ts, packages/provider-copilot/src/server/adapter.test.ts, packages/provider-copilot/src/server/adapter.ts, packages/provider-copilot/src/server/fusion.test.ts, packages/provider-copilot/src/server/fusion.ts, packages/provider-copilot/src/server/routing.test.ts, packages/provider-copilot/src/server/routing.ts, packages/provider-copilot/src/server/status.test.ts, packages/provider-copilot/src/server/status.ts, packages/shared/src/model.test.ts, packages/shared/src/model.ts
- **claim_ids**: (none)
- **base_commit**: `a31da72b87a6a33e814b56a8ab01a1de6912e292`
- **upper_commit**: `working-tree`
- **dirty_state**: 32 staged paths, 0 unrelated unstaged paths

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-fusion-model-selection/artifacts/post-apply.patch
```

