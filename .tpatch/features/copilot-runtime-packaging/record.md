# Implementation Record: copilot-runtime-packaging

**Recorded**: 2026-10-03T03:54:20Z
**Files changed**: 27
**Patch size**: 139398 bytes
**Capture mode**: working-tree-all

## Change Summary

```
 .../artifacts/apply-recipe.json                    |  10 +-
 .../artifacts/patch-generations.json               | 105 ++++++++-
 .../artifacts/post-apply.patch                     | 250 ++++++++++++++++++---
 .tpatch/features/copilot-runtime-packaging/spec.md |   8 +-
 .../features/copilot-runtime-packaging/status.json |   6 +-
 apps/desktop/src/app/DesktopAppIdentity.test.ts    |  14 ++
 apps/desktop/src/app/DesktopAppIdentity.ts         |   1 +
 apps/desktop/src/app/DesktopClerk.test.ts          |  21 +-
 apps/desktop/src/app/DesktopClerk.ts               |  27 ++-
 apps/desktop/src/app/DesktopConfig.ts              |   1 +
 apps/desktop/src/app/DesktopEnvironment.ts         |  10 +-
 .../backend/DesktopBackendConfiguration.test.ts    |  30 +++
 .../src/backend/DesktopBackendConfiguration.ts     |  16 ++
 apps/desktop/src/wsl/DesktopWslEnvironment.test.ts | 242 ++++++++++++++++++--
 apps/desktop/src/wsl/DesktopWslEnvironment.ts      | 124 +++++-----
 docs/operations/release.md                         |  41 ++++
 packages/shared/package.json                       |   4 +
 pnpm-lock.yaml                                     |   4 +
 pnpm-workspace.yaml                                |   4 +
 scripts/build-cli-archive.ts                       |  11 +-
 scripts/build-desktop-artifact.test.ts             | 220 +++++++++++++-----
 scripts/build-desktop-artifact.ts                  |  93 +++++++-
 22 files changed, 1066 insertions(+), 176 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: (none)
- **claim_ids**: (none)
- **base_commit**: `59ed26eff8ee9ae23faad874a73d4e85778a748d`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-runtime-packaging/artifacts/post-apply.patch
```

