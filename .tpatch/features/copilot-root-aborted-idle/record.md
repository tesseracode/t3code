# Implementation Record: copilot-root-aborted-idle

**Recorded**: 2026-11-16T06:02:34Z
**Files changed**: 3
**Patch size**: 4757 bytes
**Capture mode**: working-tree-all
**Pathspecs**: packages/provider-copilot/src/server/adapter.ts,packages/provider-copilot/src/server/adapter.test.ts,docs/user/providers-copilot.md

## Change Summary

```
 docs/user/providers-copilot.md                     |  6 +++-
 .../provider-copilot/src/server/adapter.test.ts    | 32 +++++++++++++++++++---
 packages/provider-copilot/src/server/adapter.ts    |  5 +++-
 3 files changed, 37 insertions(+), 6 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: packages/provider-copilot/src/server/adapter.ts, packages/provider-copilot/src/server/adapter.test.ts, docs/user/providers-copilot.md
- **claim_ids**: (none)
- **base_commit**: `3e6a6d4ee53d7f6c02109d5731df745cf997fd7c`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-root-aborted-idle/artifacts/post-apply.patch
```

