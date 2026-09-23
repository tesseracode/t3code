# Implementation Record: wsl-runtime-executable-modes

**Recorded**: 2026-09-10T00:45:34Z
**Files changed**: 5
**Patch size**: 24456 bytes
**Capture mode**: working-tree-all
**Pathspecs**: apps/desktop/src/wsl/DesktopWslEnvironment.ts,apps/desktop/src/wsl/DesktopWslEnvironment.test.ts,scripts/build-desktop-artifact.ts,scripts/build-desktop-artifact.test.ts,docs/operations/release.md

## Change Summary

```
 apps/desktop/src/wsl/DesktopWslEnvironment.test.ts |  76 ++++++++++++++-
 apps/desktop/src/wsl/DesktopWslEnvironment.ts      |  54 +++++++++++
 docs/operations/release.md                         |   8 +-
 scripts/build-desktop-artifact.test.ts             | 102 ++++++++++++++++++++
 scripts/build-desktop-artifact.ts                  | 104 ++++++++++++++-------
 5 files changed, 308 insertions(+), 36 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: apps/desktop/src/wsl/DesktopWslEnvironment.ts, apps/desktop/src/wsl/DesktopWslEnvironment.test.ts, scripts/build-desktop-artifact.ts, scripts/build-desktop-artifact.test.ts, docs/operations/release.md
- **claim_ids**: (none)
- **base_commit**: `3adf3566f162434ce963eb64298210e1d1d47005`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/wsl-runtime-executable-modes/artifacts/post-apply.patch
```
