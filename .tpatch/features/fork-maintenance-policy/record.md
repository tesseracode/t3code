# Implementation Record: fork-maintenance-policy

**Recorded**: 2026-10-29T18:06:09Z
**Files changed**: 1
**Patch size**: 6649 bytes
**Capture mode**: committed-range
**Base commit**: 16a55122c16fdd957ac7bba8e00aed970584d0f2
**Upper bound**: 3871a7e0fff4eb7f0c54529fdad63c002eb00672
**Pathspecs**: docs/internals/fork-maintenance.md

## Capture Provenance

- **capture_mode**: `committed-range`
- **pathspecs**: docs/internals/fork-maintenance.md
- **claim_ids**: (none)
- **base_commit**: `16a55122c16fdd957ac7bba8e00aed970584d0f2`
- **upper_commit**: `3871a7e0fff4eb7f0c54529fdad63c002eb00672`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/fork-maintenance-policy/artifacts/post-apply.patch
```

*Patch was captured as a committed diff from `16a55122c16fdd957ac7bba8e00aed970584d0f2` to `HEAD`.*
