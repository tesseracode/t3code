# Implementation Record: copilot-koffi-packaging-pin

**Recorded**: 2026-09-11T17:13:13Z
**Files changed**: 5
**Patch size**: 24511 bytes
**Capture mode**: working-tree-all
**Pathspecs**: pnpm-workspace.yaml,pnpm-lock.yaml,scripts/build-desktop-artifact.ts,scripts/build-desktop-artifact.test.ts,docs/operations/release.md

## Change Summary

```
 docs/operations/release.md             |   9 +-
 pnpm-lock.yaml                         |   4 +
 pnpm-workspace.yaml                    |   6 +
 scripts/build-desktop-artifact.test.ts | 190 ++++++++++++++++++++++-------
 scripts/build-desktop-artifact.ts      | 216 ++++++++++++++++++++++++++++++++-
 5 files changed, 377 insertions(+), 48 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: pnpm-workspace.yaml, pnpm-lock.yaml, scripts/build-desktop-artifact.ts, scripts/build-desktop-artifact.test.ts, docs/operations/release.md
- **claim_ids**: (none)
- **base_commit**: `b8e2e0e8dc2d51f549224ed9c8ba815fd6eb4527`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-koffi-packaging-pin/artifacts/post-apply.patch
```
