# Implementation Record: attention-notifications

**Recorded**: 2026-10-29T16:55:47Z
**Files changed**: 29
**Patch size**: 119239 bytes
**Capture mode**: staged-index

## Change Summary

```
 .../artifacts/apply-recipe.json                    | 174 ++++++++-------------
 .../artifacts/apply-session.json                   |   7 +-
 .../artifacts/manual-validation.md                 |   4 +-
 .../artifacts/post-apply-diff.txt                  |  21 +--
 .../features/attention-notifications/status.json   |  10 +-
 5 files changed, 76 insertions(+), 140 deletions(-)
```

## Capture Provenance

- **capture_mode**: `staged-index`
- **pathspecs**: (none)
- **claim_ids**: (none)
- **base_commit**: `4de99f4a515055662ccd5d59f6f705b2ff973bd4`
- **upper_commit**: `working-tree`
- **dirty_state**: 29 staged paths, 0 unrelated unstaged paths

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/attention-notifications/artifacts/post-apply.patch
```

