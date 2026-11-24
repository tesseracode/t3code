# Implementation Record: copilot-auto-default-routing

**Recorded**: 2026-11-03T09:04:40Z
**Files changed**: 6
**Patch size**: 8813 bytes
**Capture mode**: working-tree-all
**Pathspecs**: packages/provider-copilot/src/server/status.ts,packages/provider-copilot/src/server/routing.ts,packages/provider-copilot/src/server/status.test.ts,packages/provider-copilot/src/server/routing.test.ts,packages/provider-copilot/src/server/adapter.test.ts,docs/user/providers-copilot.md

## Change Summary

```
 docs/user/providers-copilot.md                     |  8 +++--
 .../provider-copilot/src/server/adapter.test.ts    | 35 ++++++++++++++++++++++
 .../provider-copilot/src/server/routing.test.ts    | 16 +++++++++-
 packages/provider-copilot/src/server/routing.ts    |  5 ++--
 .../provider-copilot/src/server/status.test.ts     | 23 +++++++++++++-
 packages/provider-copilot/src/server/status.ts     | 10 ++-----
 6 files changed, 83 insertions(+), 14 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: packages/provider-copilot/src/server/status.ts, packages/provider-copilot/src/server/routing.ts, packages/provider-copilot/src/server/status.test.ts, packages/provider-copilot/src/server/routing.test.ts, packages/provider-copilot/src/server/adapter.test.ts, docs/user/providers-copilot.md
- **claim_ids**: (none)
- **base_commit**: `2b383e8463042f4f2332707568dbeab9a39bfe38`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-auto-default-routing/artifacts/post-apply.patch
```

