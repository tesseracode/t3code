# Implementation Record: copilot-cli-provider

**Recorded**: 2026-10-02T07:21:46Z
**Files changed**: 38
**Patch size**: 317992 bytes
**Capture mode**: working-tree-all

## Change Summary

```
 README.md                                          |   7 +-
 apps/mobile/src/components/ProviderIcon.tsx        |  11 +
 apps/server/package.json                           |   1 +
 .../Layers/ProviderInstanceRegistryHydration.ts    |  26 +-
 apps/server/src/provider/builtInDrivers.ts         |   3 +
 apps/server/src/serverSettings.test.ts             |  27 ++
 apps/server/src/serverSettings.ts                  |  84 +++++-
 apps/server/src/textGeneration/TextGeneration.ts   |   9 +-
 apps/web/src/components/chat/providerIconUtils.ts  |   3 +
 .../settings/AddProviderInstanceDialog.tsx         |   7 +-
 .../settings/ProviderSettingsForm.test.ts          |  13 +
 .../components/settings/ProviderSettingsPanel.tsx  |  34 ++-
 .../settings/SettingsPanels.logic.test.ts          |  29 ++
 .../components/settings/SettingsPanels.logic.ts    |  10 +
 .../src/components/settings/providerDriverMeta.ts  |  22 +-
 docs/README.md                                     |   2 +-
 packages/contracts/src/model.ts                    |   8 +
 packages/contracts/src/providerRuntime.test.ts     |  19 ++
 packages/contracts/src/providerRuntime.ts          |   2 +
 packages/contracts/src/settings.test.ts            |  26 ++
 packages/contracts/src/settings.ts                 |  57 ++++
 pnpm-lock.yaml                                     | 300 +++++++++++++++++++++
 pnpm-workspace.yaml                                |   4 +
 scripts/lib/cli-external-packages.test.ts          |  16 +-
 scripts/lib/cli-external-packages.ts               |  10 +
 25 files changed, 702 insertions(+), 28 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: (none)
- **claim_ids**: (none)
- **base_commit**: `d531667fe40facba5e8fb14418031972a6edfccf`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-cli-provider/artifacts/post-apply.patch
```

