# Implementation Record: fork-patch-flow-convention

**Recorded**: 2026-11-24T07:13:38Z
**Files changed**: 2
**Patch size**: 11503 bytes
**Capture mode**: staged-index
**Pathspecs**: docs/internals/fork-maintenance.md,docs/operations/patch-flow.md

## Capture Provenance

- **capture_mode**: `staged-index`
- **pathspecs**: docs/internals/fork-maintenance.md, docs/operations/patch-flow.md
- **claim_ids**: (none)
- **base_commit**: `4a1c13d5b0041ba2f6daf8ed8a2e1576bb6e1d72`
- **upper_commit**: `working-tree`
- **dirty_state**: 2 staged paths, 0 unrelated unstaged paths

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/fork-patch-flow-convention/artifacts/post-apply.patch
```

