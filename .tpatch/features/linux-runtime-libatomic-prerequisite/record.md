# Implementation Record: linux-runtime-libatomic-prerequisite

**Recorded**: 2026-10-30T10:12:41Z
**Files changed**: 2
**Patch size**: 2855 bytes
**Capture mode**: working-tree-all

## Change Summary

```
 .tpatch/FEATURES.md                    |  1 +
 docs/operations/fork-native-preview.md | 14 ++++++++++++++
 docs/user/install.md                   | 21 ++++++++++++++++++++-
 3 files changed, 35 insertions(+), 1 deletion(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: (none)
- **claim_ids**: (none)
- **base_commit**: `4a5ad9255cefc6cecee050f576e584e618aed71e`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/linux-runtime-libatomic-prerequisite/artifacts/post-apply.patch
```

