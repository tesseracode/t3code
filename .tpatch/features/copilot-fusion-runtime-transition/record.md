# Implementation Record: copilot-fusion-runtime-transition

**Recorded**: 2026-11-05T07:42:13Z
**Files changed**: 3
**Patch size**: 4216 bytes
**Capture mode**: working-tree-all
**Pathspecs**: packages/provider-copilot/src/server/adapter.ts,packages/provider-copilot/src/server/adapter.test.ts,docs/user/providers-copilot.md

## Change Summary

```
 docs/user/providers-copilot.md                     |  6 ++--
 .../provider-copilot/src/server/adapter.test.ts    | 33 ++++++++++++++++++++++
 packages/provider-copilot/src/server/adapter.ts    | 13 +++++++--
 3 files changed, 48 insertions(+), 4 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: packages/provider-copilot/src/server/adapter.ts, packages/provider-copilot/src/server/adapter.test.ts, docs/user/providers-copilot.md
- **claim_ids**: (none)
- **base_commit**: `c69222b5429a77fb92e985d37710bff6df9c593b`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-fusion-runtime-transition/artifacts/post-apply.patch
```

