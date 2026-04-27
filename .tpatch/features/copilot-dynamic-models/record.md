# Implementation Record: copilot-dynamic-models

**Recorded**: 2026-04-18T20:06:58Z
**Files changed**: 3
**Patch size**: 7766 bytes

## Change Summary

```
 .../artifacts/post-apply-diff.txt                  | 10 +--
 .../artifacts/post-apply.patch                     | 88 ++++++++++++++++++++--
 .tpatch/features/copilot-cli-provider/record.md    | 16 ++--
 .tpatch/features/copilot-cli-provider/status.json  |  4 +-
 .../artifacts/post-apply.patch                     | 88 ++++++++++++++++++++--
 5 files changed, 180 insertions(+), 26 deletions(-)
```

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-dynamic-models/artifacts/post-apply.patch
```

*Patch was captured as a committed diff from `11f51f65` to `HEAD`.*
