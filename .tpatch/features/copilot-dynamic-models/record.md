# Implementation Record: copilot-dynamic-models

**Recorded**: 2026-04-27T01:56:36Z
**Files changed**: 27
**Patch size**: 137285 bytes

## Change Summary

```
 .tpatch/FEATURES.md                                |   19 +-
 .../artifacts/post-apply-diff.txt                  |    5 +-
 .../artifacts/post-apply.patch                     | 1870 ++++++----
 .tpatch/features/copilot-cli-provider/record.md    |   11 +-
 .tpatch/features/copilot-cli-provider/status.json  |    4 +-
 .../artifacts/post-apply.patch                     | 3831 +++++++++++++++++++-
 .tpatch/features/toast-close-button/status.json    |    4 +-
 7 files changed, 4756 insertions(+), 988 deletions(-)
```

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-dynamic-models/artifacts/post-apply.patch
```

*Patch was captured as a committed diff from `main` to `HEAD`.*
