# Implementation Record: fork-maintenance-check-scope

**Recorded**: 2026-10-29T17:46:09Z
**Files changed**: 3
**Patch size**: 2420 bytes
**Capture mode**: working-tree-all
**Pathspecs**: .github/scripts/ci-changes.cjs,scripts/lib/ci-changes.test.ts,vite.config.ts

## Change Summary

```
 .github/scripts/ci-changes.cjs | 2 +-
 vite.config.ts                 | 3 +++
 2 files changed, 4 insertions(+), 1 deletion(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: .github/scripts/ci-changes.cjs, scripts/lib/ci-changes.test.ts, vite.config.ts
- **claim_ids**: (none)
- **base_commit**: `3f9e8448cfb55f09c0025837031bb02d63c9d59d`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/fork-maintenance-check-scope/artifacts/post-apply.patch
```

