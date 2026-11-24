# Implementation Record: copilot-extension-opt-out

**Recorded**: 2026-11-05T07:57:22Z
**Files changed**: 2
**Patch size**: 3274 bytes
**Capture mode**: working-tree-all
**Pathspecs**: packages/provider-copilot/src/server/adapter.ts,packages/provider-copilot/src/server/adapter.test.ts

## Change Summary

```
 .../provider-copilot/src/server/adapter.test.ts    | 33 ++++++++++++++++++++--
 packages/provider-copilot/src/server/adapter.ts    |  1 +
 2 files changed, 31 insertions(+), 3 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: packages/provider-copilot/src/server/adapter.ts, packages/provider-copilot/src/server/adapter.test.ts
- **claim_ids**: (none)
- **base_commit**: `6b43f8280c25fa4734ac823c2fc97cdfb614f390`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-extension-opt-out/artifacts/post-apply.patch
```

