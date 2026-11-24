# Implementation Record: wsl-runtime-fixture-newlines

**Recorded**: 2026-09-10T22:38:47Z
**Files changed**: 1
**Patch size**: 1777 bytes
**Capture mode**: working-tree-all
**Pathspecs**: apps/desktop/src/wsl/DesktopWslEnvironment.test.ts

## Change Summary

```
 apps/desktop/src/wsl/DesktopWslEnvironment.test.ts | 6 +++---
 1 file changed, 3 insertions(+), 3 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: apps/desktop/src/wsl/DesktopWslEnvironment.test.ts
- **claim_ids**: (none)
- **base_commit**: `9ac52707e2756db13d92246e606c74fd7474b34d`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/wsl-runtime-fixture-newlines/artifacts/post-apply.patch
```
