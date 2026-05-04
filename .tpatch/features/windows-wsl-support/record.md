# Implementation Record: windows-wsl-support

**Recorded**: 2026-05-04T06:22:13Z
**Files changed**: 3
**Patch size**: 12201 bytes

## Change Summary

```
 .../windows-wsl-support/artifacts/post-apply.patch | 5111 ++------------------
 .tpatch/features/windows-wsl-support/spec.md       |   21 +
 2 files changed, 303 insertions(+), 4829 deletions(-)
```

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/windows-wsl-support/artifacts/post-apply.patch
```

*Patch was captured as a committed diff from `27bead0f~1` to `HEAD`.*
