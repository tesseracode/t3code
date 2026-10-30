# Implementation Record: windows-preview-zip-artifact

**Recorded**: 2026-10-30T07:00:18Z
**Files changed**: 1
**Patch size**: 2727 bytes
**Capture mode**: working-tree-all

## Change Summary

```
 .github/workflows/fork-native-preview.yml | 17 ++++++++++++++---
 .tpatch/FEATURES.md                       |  1 +
 2 files changed, 15 insertions(+), 3 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: (none)
- **claim_ids**: (none)
- **base_commit**: `63b22001d98b2a77c222f962a409975f4504768e`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/windows-preview-zip-artifact/artifacts/post-apply.patch
```

