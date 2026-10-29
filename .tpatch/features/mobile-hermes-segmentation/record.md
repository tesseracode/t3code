# Implementation Record: mobile-hermes-segmentation

**Recorded**: 2026-10-03T13:55:06Z
**Files changed**: 6
**Patch size**: 5954 bytes
**Capture mode**: working-tree-all

## Change Summary

```
 .tpatch/FEATURES.md      |  1 +
 apps/mobile/README.md    |  7 +++++++
 apps/mobile/index.ts     |  1 +
 apps/mobile/package.json |  1 +
 pnpm-lock.yaml           | 22 ++++++++++++++++++++++
 5 files changed, 32 insertions(+)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: (none)
- **claim_ids**: (none)
- **base_commit**: `bc9eeb9a6f5e3fe2e6d58d9c1b14d5ed93d6c2be`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/mobile-hermes-segmentation/artifacts/post-apply.patch
```

