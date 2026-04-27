# Implementation Record: windows-wsl-support

**Recorded**: 2026-04-25T21:06:04Z
**Files changed**: 29
**Patch size**: 79530 bytes

## Change Summary

```
 apps/desktop/src/backendEnvironment.test.ts        |   4 +-
 apps/desktop/src/backendEnvironment.ts             |   6 +-
 apps/desktop/src/backendTarget.test.ts             |  96 +++++
 apps/desktop/src/backendTarget.ts                  |  33 +-
 apps/desktop/src/clientPersistence.test.ts         |  15 +
 apps/desktop/src/clientPersistence.ts              |  22 +-
 apps/desktop/src/main.ts                           | 419 ++++++++++++++++++++-
 apps/desktop/src/preload.ts                        |   6 +
 apps/desktop/src/wslBackendTarget.test.ts          |  30 ++
 apps/desktop/src/wslBackendTarget.ts               |   1 +
 apps/server/src/atomicFile.ts                      |   5 +
 apps/server/src/keybindings.ts                     |   3 +-
 .../server/src/provider/Layers/ProviderRegistry.ts |  20 +-
 .../src/provider/providerStatusCache.test.ts       |  19 +
 apps/server/src/provider/providerStatusCache.ts    |   4 +-
 apps/server/src/serverRuntimeState.ts              |   3 +-
 apps/server/src/serverSettings.ts                  |   3 +-
 apps/web/src/components/ChatView.tsx               |  16 +-
 apps/web/src/components/CommandPalette.tsx         |  10 +-
 .../components/settings/ConnectionsSettings.tsx    | 312 ++++++++++++---
 .../components/settings/SettingsPanels.browser.tsx |   4 +
 apps/web/src/environments/primary/index.ts         |   6 +-
 apps/web/src/environments/primary/target.ts        |   5 +
 apps/web/src/environments/runtime/catalog.ts       |   3 +
 apps/web/src/environments/runtime/index.ts         |   1 +
 .../runtime/service.addSavedEnvironment.test.ts    |  48 ++-
 apps/web/src/environments/runtime/service.ts       |  97 +++--
 apps/web/src/localApi.test.ts                      |   4 +
 packages/contracts/src/ipc.ts                      |  24 ++
 29 files changed, 1072 insertions(+), 147 deletions(-)
```

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/windows-wsl-support/artifacts/post-apply.patch
```

_Patch was regenerated from the feature base commit with a scoped temp-index snapshot so previously untracked feature files were included without pulling unrelated branch churn into the replay artifact._
_The highest-numbered replay patch now matches the artifact patch exactly and preserves the WSL and desktop-managed environment scope after the Copilot SDK upgrade work moved into its own feature._
