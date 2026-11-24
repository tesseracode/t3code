# Implementation Record: stable-main-preservation-v014

**Recorded**: 2026-11-24T07:47:50Z
**Files changed**: 25
**Patch size**: 75934 bytes
**Capture mode**: staged-index
**Pathspecs**: README.md,apps/server/src/auth/RpcAuthorization.test.ts,apps/server/src/auth/RpcAuthorization.ts,apps/server/src/observability/RpcInstrumentation.ts,apps/server/src/provider/ProviderRegistry.test.ts,apps/server/src/provider/ProviderRegistry.ts,apps/server/src/provider/providerMaintenanceRunner.test.ts,apps/server/src/provider/testUtils/providerRegistryMock.ts,apps/server/src/serverSettings.test.ts,apps/server/src/ws.ts,apps/web/src/components/chat/composerProviderState.tsx,apps/web/src/index.css,docs/user/providers-copilot.md,packages/client-runtime/src/state/commandPermissions.test.ts,packages/contracts/src/clientRpcPermissions.ts,packages/contracts/src/rpc.ts,packages/contracts/src/server.ts,packages/provider-copilot/src/server/adapter.test.ts,packages/provider-copilot/src/server/adapter.ts,packages/provider-copilot/src/server/driver.ts,packages/provider-copilot/src/server/status.test.ts,packages/provider-copilot/src/server/status.ts,packages/provider-copilot/src/settings.ts,packages/provider-core/src/server/ProviderAdapter.ts,packages/provider-core/src/server/driver.ts

## Capture Provenance

- **capture_mode**: `staged-index`
- **pathspecs**: README.md, apps/server/src/auth/RpcAuthorization.test.ts, apps/server/src/auth/RpcAuthorization.ts, apps/server/src/observability/RpcInstrumentation.ts, apps/server/src/provider/ProviderRegistry.test.ts, apps/server/src/provider/ProviderRegistry.ts, apps/server/src/provider/providerMaintenanceRunner.test.ts, apps/server/src/provider/testUtils/providerRegistryMock.ts, apps/server/src/serverSettings.test.ts, apps/server/src/ws.ts, apps/web/src/components/chat/composerProviderState.tsx, apps/web/src/index.css, docs/user/providers-copilot.md, packages/client-runtime/src/state/commandPermissions.test.ts, packages/contracts/src/clientRpcPermissions.ts, packages/contracts/src/rpc.ts, packages/contracts/src/server.ts, packages/provider-copilot/src/server/adapter.test.ts, packages/provider-copilot/src/server/adapter.ts, packages/provider-copilot/src/server/driver.ts, packages/provider-copilot/src/server/status.test.ts, packages/provider-copilot/src/server/status.ts, packages/provider-copilot/src/settings.ts, packages/provider-core/src/server/ProviderAdapter.ts, packages/provider-core/src/server/driver.ts
- **claim_ids**: (none)
- **base_commit**: `ffeb3aabdcf2ef5f7a5f4d933f3e48e7481c924d`
- **upper_commit**: `working-tree`
- **dirty_state**: 25 staged paths, 0 unrelated unstaged paths

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/stable-main-preservation-v014/artifacts/post-apply.patch
```

