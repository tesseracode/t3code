# Implementation Record: copilot-runtime-packaging

**Recorded**: 2026-10-01T17:48:40Z
**Files changed**: 17
**Patch size**: 47757 bytes
**Capture mode**: staged-index
**Pathspecs**: .github/workflows/fork-native-preview.yml,apps/desktop/src/app/DesktopAppIdentity.test.ts,apps/desktop/src/app/DesktopAppIdentity.ts,apps/desktop/src/app/DesktopClerk.test.ts,apps/desktop/src/app/DesktopClerk.ts,apps/desktop/src/app/DesktopConfig.ts,apps/desktop/src/app/DesktopEnvironment.ts,apps/desktop/src/backend/DesktopBackendConfiguration.test.ts,apps/desktop/src/backend/DesktopBackendConfiguration.ts,apps/desktop/src/wsl/DesktopWslEnvironment.test.ts,apps/desktop/src/wsl/DesktopWslEnvironment.ts,docs/operations/fork-native-preview.md,scripts/build-desktop-artifact.ts,scripts/fork-preview-bootstrap.cjs,scripts/fork-preview-manifest.mjs,scripts/lib/fork-preview.test.ts,scripts/lib/fork-preview.ts

## Capture Provenance

- **capture_mode**: `staged-index`
- **pathspecs**: .github/workflows/fork-native-preview.yml, apps/desktop/src/app/DesktopAppIdentity.test.ts, apps/desktop/src/app/DesktopAppIdentity.ts, apps/desktop/src/app/DesktopClerk.test.ts, apps/desktop/src/app/DesktopClerk.ts, apps/desktop/src/app/DesktopConfig.ts, apps/desktop/src/app/DesktopEnvironment.ts, apps/desktop/src/backend/DesktopBackendConfiguration.test.ts, apps/desktop/src/backend/DesktopBackendConfiguration.ts, apps/desktop/src/wsl/DesktopWslEnvironment.test.ts, apps/desktop/src/wsl/DesktopWslEnvironment.ts, docs/operations/fork-native-preview.md, scripts/build-desktop-artifact.ts, scripts/fork-preview-bootstrap.cjs, scripts/fork-preview-manifest.mjs, scripts/lib/fork-preview.test.ts, scripts/lib/fork-preview.ts
- **claim_ids**: (none)
- **base_commit**: `982929e9323f00ded5c7ca943f22a0bcef669a6f`
- **upper_commit**: `working-tree`
- **dirty_state**: 17 staged paths, 0 unrelated unstaged paths

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-runtime-packaging/artifacts/post-apply.patch
```

