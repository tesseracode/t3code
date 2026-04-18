# Implementation Record: effort-theming

**Recorded**: 2026-04-18T20:06:58Z
**Files changed**: 2
**Patch size**: 2404 bytes

## Change Summary

```
 .../artifacts/post-apply-diff.txt                  | 10 +--
 .../artifacts/post-apply.patch                     | 88 ++++++++++++++++++++--
 .tpatch/features/copilot-cli-provider/record.md    | 16 ++--
 .tpatch/features/copilot-cli-provider/status.json  |  4 +-
 .../artifacts/post-apply-diff.txt                  |  8 +-
 .../artifacts/post-apply.patch                     | 88 ++++++++++++++++++++--
 .tpatch/features/copilot-dynamic-models/record.md  | 19 ++++-
 .../features/copilot-dynamic-models/status.json    |  4 +-
 8 files changed, 203 insertions(+), 34 deletions(-)
```

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/effort-theming/artifacts/post-apply.patch
```

*Patch was captured as a committed diff from `bd503457` to `HEAD`.*
