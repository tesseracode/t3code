# Implementation Record: copilot-sdk-runtime-upgrade

**Recorded**: 2026-11-24T07:08:25Z
**Files changed**: 18
**Patch size**: 55171 bytes
**Capture mode**: staged-index
**Pathspecs**: apps/server/package.json,knip.jsonc,packages/provider-copilot/package.json,packages/provider-copilot/src/server/adapter.test.ts,packages/provider-copilot/src/server/adapter.ts,packages/provider-copilot/src/server/client.ts,packages/provider-copilot/src/server/status.test.ts,packages/provider-copilot/src/server/tools.ts,packages/shared/src/copilotRuntime.test.ts,packages/shared/src/copilotRuntime.ts,pnpm-lock.yaml,pnpm-workspace.yaml,scripts/build-desktop-artifact.test.ts,scripts/build-desktop-artifact.ts,scripts/lib/cli-external-packages.test.ts,scripts/lib/copilot-payload.test.ts,scripts/lib/copilot-payload.ts,third-party-licenses.config.json

## Capture Provenance

- **capture_mode**: `staged-index`
- **pathspecs**: apps/server/package.json, knip.jsonc, packages/provider-copilot/package.json, packages/provider-copilot/src/server/adapter.test.ts, packages/provider-copilot/src/server/adapter.ts, packages/provider-copilot/src/server/client.ts, packages/provider-copilot/src/server/status.test.ts, packages/provider-copilot/src/server/tools.ts, packages/shared/src/copilotRuntime.test.ts, packages/shared/src/copilotRuntime.ts, pnpm-lock.yaml, pnpm-workspace.yaml, scripts/build-desktop-artifact.test.ts, scripts/build-desktop-artifact.ts, scripts/lib/cli-external-packages.test.ts, scripts/lib/copilot-payload.test.ts, scripts/lib/copilot-payload.ts, third-party-licenses.config.json
- **claim_ids**: (none)
- **base_commit**: `039cc17975546a3c4a028d7a294ab81696e34833`
- **upper_commit**: `working-tree`
- **dirty_state**: 18 staged paths, 0 unrelated unstaged paths

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-sdk-runtime-upgrade/artifacts/post-apply.patch
```

