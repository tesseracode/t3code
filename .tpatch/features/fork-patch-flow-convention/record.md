# Implementation Record: fork-patch-flow-convention

**Recorded**: 2026-11-06T06:44:11Z
**Files changed**: 2
**Patch size**: 11418 bytes
**Capture mode**: working-tree-all
**Pathspecs**: docs/internals/fork-maintenance.md,docs/operations/patch-flow.md

## Change Summary

```
 docs/internals/fork-maintenance.md | 24 +++++++++++++++++++-----
 1 file changed, 19 insertions(+), 5 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: docs/internals/fork-maintenance.md, docs/operations/patch-flow.md
- **claim_ids**: (none)
- **base_commit**: `090c23a2eb03bb63b6ae247896c63fc0aad1bb62`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/fork-patch-flow-convention/artifacts/post-apply.patch
```

