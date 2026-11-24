# Implementation Record: legacy-main-v014-preservation

**Recorded**: 2026-11-06T06:34:16Z
**Files changed**: 14
**Patch size**: 48959 bytes
**Capture mode**: working-tree-all
**Pathspecs**: README.md,docs/user/providers-copilot.md,packages/provider-copilot/src/settings.ts,packages/provider-copilot/src/server/status.ts,packages/provider-copilot/src/server/status.test.ts,packages/provider-copilot/src/server/driver.ts,packages/provider-copilot/src/server/adapter.ts,packages/provider-copilot/src/server/adapter.test.ts,packages/provider-core/src/server/driver.ts,apps/server/src/provider/ProviderRegistry.ts,apps/server/src/provider/ProviderRegistry.test.ts,apps/server/src/serverSettings.test.ts,apps/web/src/components/chat/composerProviderState.tsx,apps/web/src/index.css

## Change Summary

```
 README.md                                          |   3 +
 apps/server/src/provider/ProviderRegistry.test.ts  |  11 +-
 apps/server/src/provider/ProviderRegistry.ts       | 125 +++++++++++-----
 apps/server/src/serverSettings.test.ts             |  12 +-
 .../src/components/chat/composerProviderState.tsx  |  12 +-
 apps/web/src/index.css                             |  26 +++-
 docs/user/providers-copilot.md                     |   4 +
 .../provider-copilot/src/server/adapter.test.ts    | 161 +++++++++++++++++++-
 packages/provider-copilot/src/server/adapter.ts    | 162 +++++++++++++++++++--
 packages/provider-copilot/src/server/driver.ts     |   3 +-
 .../provider-copilot/src/server/status.test.ts     |  20 ++-
 packages/provider-copilot/src/server/status.ts     | 136 +++++++++--------
 packages/provider-copilot/src/settings.ts          |  18 ++-
 packages/provider-core/src/server/driver.ts        |   2 +
 14 files changed, 564 insertions(+), 131 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: README.md, docs/user/providers-copilot.md, packages/provider-copilot/src/settings.ts, packages/provider-copilot/src/server/status.ts, packages/provider-copilot/src/server/status.test.ts, packages/provider-copilot/src/server/driver.ts, packages/provider-copilot/src/server/adapter.ts, packages/provider-copilot/src/server/adapter.test.ts, packages/provider-core/src/server/driver.ts, apps/server/src/provider/ProviderRegistry.ts, apps/server/src/provider/ProviderRegistry.test.ts, apps/server/src/serverSettings.test.ts, apps/web/src/components/chat/composerProviderState.tsx, apps/web/src/index.css
- **claim_ids**: (none)
- **base_commit**: `4a34c4941f17ae85cb68f55f89da80dc9b54abc8`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/legacy-main-v014-preservation/artifacts/post-apply.patch
```

