# Implementation Record: copilot-runtime-packaging

**Recorded**: 2026-10-29T11:08:28Z
**Files changed**: 31
**Patch size**: 163455 bytes
**Capture mode**: committed-range
**Base commit**: 75b2ad95056ea428008d551e2980f1ac389defaf
**Upper bound**: fbb4c4db0d6d87cf88cd28b89e1131134fabc855
**Pathspecs**: .github/workflows/fork-native-preview.yml,apps/desktop/src/app/DesktopClerk.test.ts,apps/desktop/src/app/DesktopClerk.ts,apps/desktop/src/app/DesktopConfig.ts,apps/desktop/src/app/DesktopEnvironment.ts,apps/desktop/src/app/DesktopLegacyLocalStorage.test.ts,apps/desktop/src/app/DesktopLegacyLocalStorage.ts,apps/desktop/src/app/DesktopUserData.test.ts,apps/desktop/src/app/DesktopUserData.ts,apps/desktop/src/backend/DesktopBackendConfiguration.test.ts,apps/desktop/src/backend/DesktopBackendConfiguration.ts,apps/desktop/src/wsl/DesktopWslEnvironment.test.ts,apps/desktop/src/wsl/DesktopWslEnvironment.ts,docs/operations/fork-native-preview.md,docs/operations/release.md,packages/shared/package.json,packages/shared/src/copilotRuntime.test.ts,packages/shared/src/copilotRuntime.ts,scripts/build-cli-archive.ts,scripts/build-desktop-artifact.test.ts,scripts/build-desktop-artifact.ts,scripts/fork-preview-bootstrap.cjs,scripts/fork-preview-manifest.mjs,scripts/lib/cli-external-packages.test.ts,scripts/lib/cli-external-packages.ts,scripts/lib/copilot-payload.test.ts,scripts/lib/copilot-payload.ts,scripts/lib/fork-preview.test.ts,scripts/lib/fork-preview.ts,scripts/lib/runtime-external-dependencies.test.ts,scripts/lib/runtime-external-dependencies.ts

## Capture Provenance

- **capture_mode**: `committed-range`
- **pathspecs**: .github/workflows/fork-native-preview.yml, apps/desktop/src/app/DesktopClerk.test.ts, apps/desktop/src/app/DesktopClerk.ts, apps/desktop/src/app/DesktopConfig.ts, apps/desktop/src/app/DesktopEnvironment.ts, apps/desktop/src/app/DesktopLegacyLocalStorage.test.ts, apps/desktop/src/app/DesktopLegacyLocalStorage.ts, apps/desktop/src/app/DesktopUserData.test.ts, apps/desktop/src/app/DesktopUserData.ts, apps/desktop/src/backend/DesktopBackendConfiguration.test.ts, apps/desktop/src/backend/DesktopBackendConfiguration.ts, apps/desktop/src/wsl/DesktopWslEnvironment.test.ts, apps/desktop/src/wsl/DesktopWslEnvironment.ts, docs/operations/fork-native-preview.md, docs/operations/release.md, packages/shared/package.json, packages/shared/src/copilotRuntime.test.ts, packages/shared/src/copilotRuntime.ts, scripts/build-cli-archive.ts, scripts/build-desktop-artifact.test.ts, scripts/build-desktop-artifact.ts, scripts/fork-preview-bootstrap.cjs, scripts/fork-preview-manifest.mjs, scripts/lib/cli-external-packages.test.ts, scripts/lib/cli-external-packages.ts, scripts/lib/copilot-payload.test.ts, scripts/lib/copilot-payload.ts, scripts/lib/fork-preview.test.ts, scripts/lib/fork-preview.ts, scripts/lib/runtime-external-dependencies.test.ts, scripts/lib/runtime-external-dependencies.ts
- **claim_ids**: (none)
- **base_commit**: `75b2ad95056ea428008d551e2980f1ac389defaf`
- **upper_commit**: `fbb4c4db0d6d87cf88cd28b89e1131134fabc855`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-runtime-packaging/artifacts/post-apply.patch
```

*Patch was captured as a committed diff from `75b2ad95056ea428008d551e2980f1ac389defaf` to `HEAD`.*
