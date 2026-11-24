# Implementation Record: copilot-runtime-packaging-replay

**Recorded**: 2026-11-02T08:10:45Z
**Files changed**: 31
**Patch size**: 165075 bytes
**Capture mode**: committed-range
**Base commit**: ba951f958e8cd3cb6582f7902171f573621407a7
**Upper bound**: a043de31d500054e1be2d1907c09e088ad0b74de
**Pathspecs**: .github/workflows/fork-native-preview.yml,apps/desktop/src/app/DesktopClerk.test.ts,apps/desktop/src/app/DesktopClerk.ts,apps/desktop/src/app/DesktopConfig.ts,apps/desktop/src/app/DesktopEnvironment.ts,apps/desktop/src/app/DesktopLegacyLocalStorage.test.ts,apps/desktop/src/app/DesktopLegacyLocalStorage.ts,apps/desktop/src/app/DesktopUserData.test.ts,apps/desktop/src/app/DesktopUserData.ts,apps/desktop/src/backend/DesktopBackendConfiguration.test.ts,apps/desktop/src/backend/DesktopBackendConfiguration.ts,apps/desktop/src/wsl/DesktopWslEnvironment.test.ts,apps/desktop/src/wsl/DesktopWslEnvironment.ts,docs/operations/fork-native-preview.md,docs/operations/release.md,packages/shared/package.json,packages/shared/src/copilotRuntime.test.ts,packages/shared/src/copilotRuntime.ts,scripts/build-cli-archive.ts,scripts/build-desktop-artifact.test.ts,scripts/build-desktop-artifact.ts,scripts/fork-preview-bootstrap.cjs,scripts/fork-preview-manifest.mjs,scripts/lib/cli-external-packages.test.ts,scripts/lib/cli-external-packages.ts,scripts/lib/copilot-payload.test.ts,scripts/lib/copilot-payload.ts,scripts/lib/fork-preview.test.ts,scripts/lib/fork-preview.ts,scripts/lib/runtime-external-dependencies.test.ts,scripts/lib/runtime-external-dependencies.ts

## Collision Override

**Reason**: Explicit superseder preserves the complete generation-16 packaging root with an unambiguous replay identity; historical evidence retained

This patch is byte-identical to the canonical post-apply.patch of:

- `copilot-runtime-packaging` — sha256=097951c0d3a4... bytes=165075 files=31

## Capture Provenance

- **capture_mode**: `committed-range`
- **pathspecs**: .github/workflows/fork-native-preview.yml, apps/desktop/src/app/DesktopClerk.test.ts, apps/desktop/src/app/DesktopClerk.ts, apps/desktop/src/app/DesktopConfig.ts, apps/desktop/src/app/DesktopEnvironment.ts, apps/desktop/src/app/DesktopLegacyLocalStorage.test.ts, apps/desktop/src/app/DesktopLegacyLocalStorage.ts, apps/desktop/src/app/DesktopUserData.test.ts, apps/desktop/src/app/DesktopUserData.ts, apps/desktop/src/backend/DesktopBackendConfiguration.test.ts, apps/desktop/src/backend/DesktopBackendConfiguration.ts, apps/desktop/src/wsl/DesktopWslEnvironment.test.ts, apps/desktop/src/wsl/DesktopWslEnvironment.ts, docs/operations/fork-native-preview.md, docs/operations/release.md, packages/shared/package.json, packages/shared/src/copilotRuntime.test.ts, packages/shared/src/copilotRuntime.ts, scripts/build-cli-archive.ts, scripts/build-desktop-artifact.test.ts, scripts/build-desktop-artifact.ts, scripts/fork-preview-bootstrap.cjs, scripts/fork-preview-manifest.mjs, scripts/lib/cli-external-packages.test.ts, scripts/lib/cli-external-packages.ts, scripts/lib/copilot-payload.test.ts, scripts/lib/copilot-payload.ts, scripts/lib/fork-preview.test.ts, scripts/lib/fork-preview.ts, scripts/lib/runtime-external-dependencies.test.ts, scripts/lib/runtime-external-dependencies.ts
- **claim_ids**: (none)
- **base_commit**: `ba951f958e8cd3cb6582f7902171f573621407a7`
- **upper_commit**: `a043de31d500054e1be2d1907c09e088ad0b74de`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-runtime-packaging-replay/artifacts/post-apply.patch
```

*Patch was captured as a committed diff from `ba951f958e8cd3cb6582f7902171f573621407a7` to `HEAD`.*
