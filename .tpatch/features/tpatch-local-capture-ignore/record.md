# Implementation Record: tpatch-local-capture-ignore

**Recorded**: 2026-10-29T07:21:50Z
**Files changed**: 1
**Patch size**: 230 bytes
**Capture mode**: working-tree-all
**Pathspecs**: .gitignore

## Change Summary

```
 .gitignore | 1 +
 1 file changed, 1 insertion(+)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: .gitignore
- **claim_ids**: (none)
- **base_commit**: `23e896ef9b1fa38d68443c2bf5ad330f19d9cacb`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/tpatch-local-capture-ignore/artifacts/post-apply.patch
```

