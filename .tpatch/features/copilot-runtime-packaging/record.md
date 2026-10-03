# Implementation Record: copilot-runtime-packaging

**Recorded**: 2026-10-03T02:33:52Z
**Files changed**: 27
**Patch size**: 132030 bytes
**Capture mode**: working-tree-all

## Change Summary

```
 .../artifacts/apply-recipe.json                    | 122 ++++++++++--
 .tpatch/features/copilot-runtime-packaging/spec.md |  24 ++-
 apps/desktop/src/app/DesktopAppIdentity.test.ts    |  14 ++
 apps/desktop/src/app/DesktopAppIdentity.ts         |   1 +
 apps/desktop/src/app/DesktopClerk.test.ts          |  21 +-
 apps/desktop/src/app/DesktopClerk.ts               |  27 ++-
 apps/desktop/src/app/DesktopConfig.ts              |   1 +
 apps/desktop/src/app/DesktopEnvironment.ts         |  10 +-
 .../backend/DesktopBackendConfiguration.test.ts    |  30 +++
 .../src/backend/DesktopBackendConfiguration.ts     |  16 ++
 apps/desktop/src/wsl/DesktopWslEnvironment.test.ts | 144 ++++++++++++--
 apps/desktop/src/wsl/DesktopWslEnvironment.ts      |  56 ++++--
 docs/operations/release.md                         |  41 ++++
 packages/shared/package.json                       |   4 +
 pnpm-lock.yaml                                     |   7 +
 pnpm-workspace.yaml                                |   4 +
 scripts/build-cli-archive.ts                       |  11 +-
 scripts/build-desktop-artifact.test.ts             | 220 ++++++++++++++++-----
 scripts/build-desktop-artifact.ts                  |  93 ++++++++-
 19 files changed, 732 insertions(+), 114 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: (none)
- **claim_ids**: (none)
- **base_commit**: `71266a2664c23ac267a0e817eee6b86bc0ba672a`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-runtime-packaging/artifacts/post-apply.patch
```

