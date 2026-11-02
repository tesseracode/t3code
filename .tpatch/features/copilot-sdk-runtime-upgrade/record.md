# Implementation Record: copilot-sdk-runtime-upgrade

**Recorded**: 2026-11-02T08:14:34Z
**Files changed**: 16
**Patch size**: 51425 bytes
**Capture mode**: working-tree-all
**Pathspecs**: apps/server/package.json,packages/provider-copilot/package.json,packages/provider-copilot/src/server/adapter.test.ts,packages/provider-copilot/src/server/adapter.ts,packages/provider-copilot/src/server/client.ts,packages/provider-copilot/src/server/status.test.ts,packages/provider-copilot/src/server/tools.ts,packages/shared/src/copilotRuntime.test.ts,packages/shared/src/copilotRuntime.ts,pnpm-lock.yaml,pnpm-workspace.yaml,scripts/build-desktop-artifact.test.ts,scripts/build-desktop-artifact.ts,scripts/lib/cli-external-packages.test.ts,scripts/lib/copilot-payload.test.ts,scripts/lib/copilot-payload.ts

## Change Summary

```
 apps/server/package.json                           |   1 +
 packages/provider-copilot/package.json             |   2 +-
 .../provider-copilot/src/server/adapter.test.ts    |  20 +++-
 packages/provider-copilot/src/server/adapter.ts    |   8 +-
 packages/provider-copilot/src/server/client.ts     |  16 ++-
 .../provider-copilot/src/server/status.test.ts     |  19 +++-
 packages/provider-copilot/src/server/tools.ts      |   4 +-
 packages/shared/src/copilotRuntime.test.ts         |  39 +++++--
 packages/shared/src/copilotRuntime.ts              |  49 ++++++--
 pnpm-lock.yaml                                     | 110 ++++++++----------
 pnpm-workspace.yaml                                |   8 +-
 scripts/build-desktop-artifact.test.ts             |   2 +-
 scripts/build-desktop-artifact.ts                  |   6 +-
 scripts/lib/cli-external-packages.test.ts          |  10 ++
 scripts/lib/copilot-payload.test.ts                | 123 ++++++++-------------
 scripts/lib/copilot-payload.ts                     |  92 ++++-----------
 16 files changed, 256 insertions(+), 253 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: apps/server/package.json, packages/provider-copilot/package.json, packages/provider-copilot/src/server/adapter.test.ts, packages/provider-copilot/src/server/adapter.ts, packages/provider-copilot/src/server/client.ts, packages/provider-copilot/src/server/status.test.ts, packages/provider-copilot/src/server/tools.ts, packages/shared/src/copilotRuntime.test.ts, packages/shared/src/copilotRuntime.ts, pnpm-lock.yaml, pnpm-workspace.yaml, scripts/build-desktop-artifact.test.ts, scripts/build-desktop-artifact.ts, scripts/lib/cli-external-packages.test.ts, scripts/lib/copilot-payload.test.ts, scripts/lib/copilot-payload.ts
- **claim_ids**: (none)
- **base_commit**: `c88f207e5e9dc0789612e66c911492a1491bcc21`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-sdk-runtime-upgrade/artifacts/post-apply.patch
```

