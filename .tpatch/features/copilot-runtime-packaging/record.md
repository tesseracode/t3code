# Implementation Record: copilot-runtime-packaging

**Recorded**: 2026-09-26T04:59:04Z
**Files changed**: 13
**Patch size**: 84443 bytes
**Capture mode**: committed-range
**Base commit**: 187e91eb870209e770c6eb7901f7feeee831c9d6
**Upper bound**: HEAD
**Pathspecs**: apps/desktop/src/wsl/DesktopWslEnvironment.test.ts,apps/desktop/src/wsl/DesktopWslEnvironment.ts,docs/operations/release.md,packages/shared/package.json,packages/shared/src/copilotRuntime.test.ts,packages/shared/src/copilotRuntime.ts,pnpm-lock.yaml,pnpm-workspace.yaml,scripts/build-cli-archive.ts,scripts/build-desktop-artifact.test.ts,scripts/build-desktop-artifact.ts,scripts/lib/copilot-payload.test.ts,scripts/lib/copilot-payload.ts

## Capture Provenance

- **capture_mode**: `committed-range`
- **pathspecs**: apps/desktop/src/wsl/DesktopWslEnvironment.test.ts, apps/desktop/src/wsl/DesktopWslEnvironment.ts, docs/operations/release.md, packages/shared/package.json, packages/shared/src/copilotRuntime.test.ts, packages/shared/src/copilotRuntime.ts, pnpm-lock.yaml, pnpm-workspace.yaml, scripts/build-cli-archive.ts, scripts/build-desktop-artifact.test.ts, scripts/build-desktop-artifact.ts, scripts/lib/copilot-payload.test.ts, scripts/lib/copilot-payload.ts
- **claim_ids**: (none)
- **base_commit**: `187e91eb870209e770c6eb7901f7feeee831c9d6`
- **upper_commit**: `HEAD`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-runtime-packaging/artifacts/post-apply.patch
```

*Patch was captured as a committed diff from `187e91eb870209e770c6eb7901f7feeee831c9d6` to `HEAD`.*
