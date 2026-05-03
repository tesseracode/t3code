# Implementation Record: copilot-turn-timing

<<<<<<< HEAD
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
 .../artifacts/post-apply-diff.txt                  |   14 +-
 .../artifacts/post-apply.patch                     | 3831 +++++++++++++++++++-
 .tpatch/features/copilot-dynamic-models/record.md  |   22 +-
 .../features/copilot-dynamic-models/status.json    |    4 +-
 .../artifacts/post-apply-diff.txt                  |   17 +-
 .../artifacts/post-apply.patch                     | 3770 ++++++++++++++++++-
 .tpatch/features/copilot-plan-compaction/record.md |   25 +-
 .../features/copilot-plan-compaction/status.json   |    4 +-
 .../copilot-turn-timing/artifacts/post-apply.patch | 3790 ++++++++++++++++++-
 .tpatch/features/toast-close-button/status.json    |    4 +-
 15 files changed, 12292 insertions(+), 1098 deletions(-)
```
=======
**Recorded**: 2026-05-03T07:26:10Z
**Files changed**: 27
**Patch size**: 169894 bytes
>>>>>>> reconcile/multi-provider

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-turn-timing/artifacts/post-apply.patch
```

<<<<<<< HEAD
*Patch was captured as a committed diff from `main` to `HEAD`.*
=======
*Patch was captured as a committed diff from `e42c13bf~1` to `HEAD`.*
>>>>>>> reconcile/multi-provider
