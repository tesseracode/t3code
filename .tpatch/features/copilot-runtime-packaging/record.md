# Implementation Record: copilot-runtime-packaging

**Recorded**: 2026-10-29T16:55:13Z
**Files changed**: 31
**Patch size**: 163778 bytes
**Capture mode**: staged-index
**Pathspecs**: .github/workflows/fork-native-preview.yml,apps/desktop/src/app/DesktopClerk.test.ts,apps/desktop/src/app/DesktopClerk.ts,apps/desktop/src/app/DesktopConfig.ts,apps/desktop/src/app/DesktopEnvironment.ts,apps/desktop/src/app/DesktopLegacyLocalStorage.test.ts,apps/desktop/src/app/DesktopLegacyLocalStorage.ts,apps/desktop/src/app/DesktopUserData.test.ts,apps/desktop/src/app/DesktopUserData.ts,apps/desktop/src/backend/DesktopBackendConfiguration.test.ts,apps/desktop/src/backend/DesktopBackendConfiguration.ts,apps/desktop/src/wsl/DesktopWslEnvironment.test.ts,apps/desktop/src/wsl/DesktopWslEnvironment.ts,docs/operations/fork-native-preview.md,docs/operations/release.md,packages/shared/package.json,packages/shared/src/copilotRuntime.test.ts,packages/shared/src/copilotRuntime.ts,scripts/build-cli-archive.ts,scripts/build-desktop-artifact.test.ts,scripts/build-desktop-artifact.ts,scripts/fork-preview-bootstrap.cjs,scripts/fork-preview-manifest.mjs,scripts/lib/cli-external-packages.test.ts,scripts/lib/cli-external-packages.ts,scripts/lib/copilot-payload.test.ts,scripts/lib/copilot-payload.ts,scripts/lib/fork-preview.test.ts,scripts/lib/fork-preview.ts,scripts/lib/runtime-external-dependencies.test.ts,scripts/lib/runtime-external-dependencies.ts

## Capture Provenance

- **capture_mode**: `staged-index`
- **pathspecs**: .github/workflows/fork-native-preview.yml, apps/desktop/src/app/DesktopClerk.test.ts, apps/desktop/src/app/DesktopClerk.ts, apps/desktop/src/app/DesktopConfig.ts, apps/desktop/src/app/DesktopEnvironment.ts, apps/desktop/src/app/DesktopLegacyLocalStorage.test.ts, apps/desktop/src/app/DesktopLegacyLocalStorage.ts, apps/desktop/src/app/DesktopUserData.test.ts, apps/desktop/src/app/DesktopUserData.ts, apps/desktop/src/backend/DesktopBackendConfiguration.test.ts, apps/desktop/src/backend/DesktopBackendConfiguration.ts, apps/desktop/src/wsl/DesktopWslEnvironment.test.ts, apps/desktop/src/wsl/DesktopWslEnvironment.ts, docs/operations/fork-native-preview.md, docs/operations/release.md, packages/shared/package.json, packages/shared/src/copilotRuntime.test.ts, packages/shared/src/copilotRuntime.ts, scripts/build-cli-archive.ts, scripts/build-desktop-artifact.test.ts, scripts/build-desktop-artifact.ts, scripts/fork-preview-bootstrap.cjs, scripts/fork-preview-manifest.mjs, scripts/lib/cli-external-packages.test.ts, scripts/lib/cli-external-packages.ts, scripts/lib/copilot-payload.test.ts, scripts/lib/copilot-payload.ts, scripts/lib/fork-preview.test.ts, scripts/lib/fork-preview.ts, scripts/lib/runtime-external-dependencies.test.ts, scripts/lib/runtime-external-dependencies.ts
- **claim_ids**: (none)
- **base_commit**: `dde51c8e18801099e417c80dd369e3a9216af8f3`
- **upper_commit**: `working-tree`
- **dirty_state**: 31 staged paths, 0 unrelated unstaged paths

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-runtime-packaging/artifacts/post-apply.patch
```
