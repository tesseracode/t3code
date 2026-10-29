# Implementation Record: copilot-cli-provider

**Recorded**: 2026-10-29T07:57:55Z
**Files changed**: 30
**Patch size**: 170142 bytes
**Capture mode**: working-tree-all
**Pathspecs**: packages/provider-copilot/,apps/server/package.json,apps/server/src/provider/builtInDrivers.ts,apps/server/src/serverSettings.ts,apps/server/src/serverSettings.test.ts,apps/web/package.json,apps/web/src/components/settings/providerDriverMeta.ts,apps/mobile/package.json,apps/mobile/src/lib/providerClients.ts,packages/contracts/src/settings.ts,pnpm-workspace.yaml,pnpm-lock.yaml,docs/user/providers-copilot.md,docs/internals/providers.md

## Change Summary

```
 apps/mobile/package.json                           |   1 +
 apps/mobile/src/lib/providerClients.ts             |   2 +
 apps/server/package.json                           |   1 +
 apps/server/src/provider/builtInDrivers.ts         |   3 +
 apps/server/src/serverSettings.test.ts             |  55 ++++
 apps/server/src/serverSettings.ts                  |  16 +-
 apps/web/package.json                              |   1 +
 .../src/components/settings/providerDriverMeta.ts  |   2 +
 docs/internals/providers.md                        |  18 ++
 packages/contracts/src/settings.ts                 |   2 +-
 pnpm-lock.yaml                                     | 343 +++++++++++++++++++++
 pnpm-workspace.yaml                                |   6 +
 12 files changed, 448 insertions(+), 2 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: packages/provider-copilot/, apps/server/package.json, apps/server/src/provider/builtInDrivers.ts, apps/server/src/serverSettings.ts, apps/server/src/serverSettings.test.ts, apps/web/package.json, apps/web/src/components/settings/providerDriverMeta.ts, apps/mobile/package.json, apps/mobile/src/lib/providerClients.ts, packages/contracts/src/settings.ts, pnpm-workspace.yaml, pnpm-lock.yaml, docs/user/providers-copilot.md, docs/internals/providers.md
- **claim_ids**: (none)
- **base_commit**: `010dacb26afec7a34fb8a3010a2cd3396d5b4550`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-cli-provider/artifacts/post-apply.patch
```
