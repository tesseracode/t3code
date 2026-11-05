# Implementation Record: copilot-idle-agent-completion

**Recorded**: 2026-11-05T07:44:23Z
**Files changed**: 2
**Patch size**: 5014 bytes
**Capture mode**: working-tree-all
**Pathspecs**: packages/provider-copilot/src/server/adapter.ts,packages/provider-copilot/src/server/adapter.test.ts

## Change Summary

```
 .../provider-copilot/src/server/adapter.test.ts    | 42 ++++++++++++++++++++++
 packages/provider-copilot/src/server/adapter.ts    | 20 +++++------
 2 files changed, 52 insertions(+), 10 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: packages/provider-copilot/src/server/adapter.ts, packages/provider-copilot/src/server/adapter.test.ts
- **claim_ids**: (none)
- **base_commit**: `0947fd992e5e8ddab8d0c28f008b4ad72ec7f912`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-idle-agent-completion/artifacts/post-apply.patch
```

