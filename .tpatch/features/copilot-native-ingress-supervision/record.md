# Implementation Record: copilot-native-ingress-supervision

**Recorded**: 2026-11-06T08:50:05Z
**Files changed**: 2
**Patch size**: 7089 bytes
**Capture mode**: working-tree-all
**Pathspecs**: packages/provider-copilot/src/server/adapter.ts,packages/provider-copilot/src/server/adapter.test.ts

## Change Summary

```
 .../provider-copilot/src/server/adapter.test.ts    | 56 +++++++++++++++++++++-
 packages/provider-copilot/src/server/adapter.ts    | 22 ++++++++-
 2 files changed, 74 insertions(+), 4 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: packages/provider-copilot/src/server/adapter.ts, packages/provider-copilot/src/server/adapter.test.ts
- **claim_ids**: (none)
- **base_commit**: `0490e7bb2753ee455d58f9832f6ea943af81b0e0`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-native-ingress-supervision/artifacts/post-apply.patch
```

