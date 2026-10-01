# Implementation Record: copilot-runtime-packaging

**Recorded**: 2026-10-01T18:43:12Z
**Files changed**: 27
**Patch size**: 131966 bytes
**Capture mode**: committed-range
**Base commit**: 187e91eb870209e770c6eb7901f7feeee831c9d6
**Upper bound**: HEAD
**Pathspecs**: .github/workflows/fork-native-preview.yml,apps/desktop/src/app/DesktopAppIdentity.test.ts,apps/desktop/src/app/DesktopAppIdentity.ts,apps/desktop/src/app/DesktopClerk.test.ts,apps/desktop/src/app/DesktopClerk.ts,apps/desktop/src/app/DesktopConfig.ts,apps/desktop/src/app/DesktopEnvironment.ts,apps/desktop/src/backend/DesktopBackendConfiguration.test.ts,apps/desktop/src/backend/DesktopBackendConfiguration.ts,apps/desktop/src/wsl/DesktopWslEnvironment.test.ts,apps/desktop/src/wsl/DesktopWslEnvironment.ts,docs/operations/fork-native-preview.md,docs/operations/release.md,packages/shared/package.json,packages/shared/src/copilotRuntime.test.ts,packages/shared/src/copilotRuntime.ts,pnpm-lock.yaml,pnpm-workspace.yaml,scripts/build-cli-archive.ts,scripts/build-desktop-artifact.test.ts,scripts/build-desktop-artifact.ts,scripts/fork-preview-bootstrap.cjs,scripts/fork-preview-manifest.mjs,scripts/lib/copilot-payload.test.ts,scripts/lib/copilot-payload.ts,scripts/lib/fork-preview.test.ts,scripts/lib/fork-preview.ts

## Capture Provenance

- **capture_mode**: `committed-range`
- **pathspecs**: .github/workflows/fork-native-preview.yml, apps/desktop/src/app/DesktopAppIdentity.test.ts, apps/desktop/src/app/DesktopAppIdentity.ts, apps/desktop/src/app/DesktopClerk.test.ts, apps/desktop/src/app/DesktopClerk.ts, apps/desktop/src/app/DesktopConfig.ts, apps/desktop/src/app/DesktopEnvironment.ts, apps/desktop/src/backend/DesktopBackendConfiguration.test.ts, apps/desktop/src/backend/DesktopBackendConfiguration.ts, apps/desktop/src/wsl/DesktopWslEnvironment.test.ts, apps/desktop/src/wsl/DesktopWslEnvironment.ts, docs/operations/fork-native-preview.md, docs/operations/release.md, packages/shared/package.json, packages/shared/src/copilotRuntime.test.ts, packages/shared/src/copilotRuntime.ts, pnpm-lock.yaml, pnpm-workspace.yaml, scripts/build-cli-archive.ts, scripts/build-desktop-artifact.test.ts, scripts/build-desktop-artifact.ts, scripts/fork-preview-bootstrap.cjs, scripts/fork-preview-manifest.mjs, scripts/lib/copilot-payload.test.ts, scripts/lib/copilot-payload.ts, scripts/lib/fork-preview.test.ts, scripts/lib/fork-preview.ts
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
