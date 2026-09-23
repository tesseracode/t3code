# Implementation Record: copilot-cli-provider

**Recorded**: 2026-09-23T04:28:24Z
**Files changed**: 38
**Patch size**: 303026 bytes
**Capture mode**: staged-index

## Change Summary

```
 .tpatch/features/copilot-cli-provider/analysis.md  |  16 +-
 .../artifacts/apply-session.json                   |   7 +-
 .../artifacts/post-apply-diff.txt                  |  45 +---
 .../artifacts/reconcile-evidence.jsonl             |   4 +
 .../artifacts/reconcile-session.json               | 288 +++++++++++++++------
 .../copilot-cli-provider/artifacts/reconcile.md    |  93 +++++--
 .../features/copilot-cli-provider/exploration.md   |  27 +-
 .tpatch/features/copilot-cli-provider/spec.md      |  12 +
 .tpatch/features/copilot-cli-provider/status.json  |  16 +-
 9 files changed, 348 insertions(+), 160 deletions(-)
```

## Capture Provenance

- **capture_mode**: `staged-index`
- **pathspecs**: (none)
- **claim_ids**: (none)
- **base_commit**: `8366d1db3119e8f5260d0a89584c49e5b4cbe53f`
- **upper_commit**: `working-tree`
- **dirty_state**: 38 staged paths, 0 unrelated unstaged paths

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-cli-provider/artifacts/post-apply.patch
```

