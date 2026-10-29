# Implementation Record: copilot-runtime-packaging

**Recorded**: 2026-10-29T08:17:29Z
**Files changed**: 29
**Patch size**: 156575 bytes
**Capture mode**: staged-index
**Pathspecs**: .github/workflows/fork-native-preview.yml,apps/desktop/src/app/DesktopClerk.test.ts,apps/desktop/src/app/DesktopClerk.ts,apps/desktop/src/app/DesktopConfig.ts,apps/desktop/src/app/DesktopEnvironment.ts,apps/desktop/src/app/DesktopUserData.test.ts,apps/desktop/src/app/DesktopUserData.ts,apps/desktop/src/backend/DesktopBackendConfiguration.test.ts,apps/desktop/src/backend/DesktopBackendConfiguration.ts,apps/desktop/src/wsl/DesktopWslEnvironment.test.ts,apps/desktop/src/wsl/DesktopWslEnvironment.ts,docs/operations/fork-native-preview.md,docs/operations/release.md,packages/shared/package.json,packages/shared/src/copilotRuntime.test.ts,packages/shared/src/copilotRuntime.ts,scripts/build-cli-archive.ts,scripts/build-desktop-artifact.test.ts,scripts/build-desktop-artifact.ts,scripts/fork-preview-bootstrap.cjs,scripts/fork-preview-manifest.mjs,scripts/lib/cli-external-packages.test.ts,scripts/lib/cli-external-packages.ts,scripts/lib/copilot-payload.test.ts,scripts/lib/copilot-payload.ts,scripts/lib/fork-preview.test.ts,scripts/lib/fork-preview.ts,scripts/lib/runtime-external-dependencies.test.ts,scripts/lib/runtime-external-dependencies.ts

## Capture Provenance

- **capture_mode**: `staged-index`
- **pathspecs**: .github/workflows/fork-native-preview.yml, apps/desktop/src/app/DesktopClerk.test.ts, apps/desktop/src/app/DesktopClerk.ts, apps/desktop/src/app/DesktopConfig.ts, apps/desktop/src/app/DesktopEnvironment.ts, apps/desktop/src/app/DesktopUserData.test.ts, apps/desktop/src/app/DesktopUserData.ts, apps/desktop/src/backend/DesktopBackendConfiguration.test.ts, apps/desktop/src/backend/DesktopBackendConfiguration.ts, apps/desktop/src/wsl/DesktopWslEnvironment.test.ts, apps/desktop/src/wsl/DesktopWslEnvironment.ts, docs/operations/fork-native-preview.md, docs/operations/release.md, packages/shared/package.json, packages/shared/src/copilotRuntime.test.ts, packages/shared/src/copilotRuntime.ts, scripts/build-cli-archive.ts, scripts/build-desktop-artifact.test.ts, scripts/build-desktop-artifact.ts, scripts/fork-preview-bootstrap.cjs, scripts/fork-preview-manifest.mjs, scripts/lib/cli-external-packages.test.ts, scripts/lib/cli-external-packages.ts, scripts/lib/copilot-payload.test.ts, scripts/lib/copilot-payload.ts, scripts/lib/fork-preview.test.ts, scripts/lib/fork-preview.ts, scripts/lib/runtime-external-dependencies.test.ts, scripts/lib/runtime-external-dependencies.ts
- **claim_ids**: (none)
- **base_commit**: `75b2ad95056ea428008d551e2980f1ac389defaf`
- **upper_commit**: `working-tree`
- **dirty_state**: 29 staged paths, 0 unrelated unstaged paths

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-runtime-packaging/artifacts/post-apply.patch
```
