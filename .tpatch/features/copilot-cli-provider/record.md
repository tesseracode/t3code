# Implementation Record: copilot-cli-provider

**Recorded**: 2026-10-29T16:30:17Z
**Files changed**: 28
**Patch size**: 186963 bytes
**Capture mode**: staged-index

## Change Summary

```
 .../artifacts/apply-recipe.json                    |  179 +-
 .../artifacts/apply-session.json                   |    8 +-
 .../artifacts/manual-validation.md                 |    6 +-
 .../artifacts/patch-generations.json               |   42 +-
 .../artifacts/post-apply-diff.txt                  |   21 +-
 .../artifacts/post-apply.patch                     | 4436 +-------------------
 .../artifacts/reconcile-evidence.jsonl             |    5 +
 .../artifacts/reconcile-session.json               |  265 +-
 .../copilot-cli-provider/artifacts/reconcile.md    |   48 +-
 .tpatch/features/copilot-cli-provider/record.md    |   42 +-
 .tpatch/features/copilot-cli-provider/spec.md      |    6 +-
 .tpatch/features/copilot-cli-provider/status.json  |   14 +-
 12 files changed, 339 insertions(+), 4733 deletions(-)
```

## Capture Provenance

- **capture_mode**: `staged-index`
- **pathspecs**: (none)
- **claim_ids**: (none)
- **base_commit**: `2a79a1b73b15bdd0aa093967855a8a92fd5799d9`
- **upper_commit**: `working-tree`
- **dirty_state**: 28 staged paths, 0 unrelated unstaged paths

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-cli-provider/artifacts/post-apply.patch
```
