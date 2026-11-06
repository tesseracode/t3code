# Implementation Record: fork-patch-flow-convention

**Recorded**: 2026-11-06T05:07:20Z
**Files changed**: 2
**Patch size**: 11184 bytes
**Capture mode**: working-tree-all
**Pathspecs**: docs/operations/patch-flow.md,docs/internals/fork-maintenance.md

## Change Summary

```
 docs/internals/fork-maintenance.md | 24 +++++++++++++++++++-----
 1 file changed, 19 insertions(+), 5 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: docs/operations/patch-flow.md, docs/internals/fork-maintenance.md
- **claim_ids**: (none)
- **base_commit**: `98213a256b069ed510aa07f92c6632fc5f9ef146`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/fork-patch-flow-convention/artifacts/post-apply.patch
```

