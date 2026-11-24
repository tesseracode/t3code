# Implementation Record: stable-main-preservation-v014

**Recorded**: 2026-11-06T06:47:58Z
**Files changed**: 25
**Patch size**: 76874 bytes
**Capture mode**: working-tree-all
**Pathspecs**: README.md,apps/server/src/auth/RpcAuthorization.test.ts,apps/server/src/auth/RpcAuthorization.ts,apps/server/src/observability/RpcInstrumentation.ts,apps/server/src/provider/ProviderRegistry.test.ts,apps/server/src/provider/ProviderRegistry.ts,apps/server/src/provider/providerMaintenanceRunner.test.ts,apps/server/src/provider/testUtils/providerRegistryMock.ts,apps/server/src/serverSettings.test.ts,apps/server/src/ws.ts,apps/web/src/components/chat/composerProviderState.tsx,apps/web/src/index.css,docs/user/providers-copilot.md,packages/client-runtime/src/state/commandPermissions.test.ts,packages/contracts/src/clientRpcPermissions.ts,packages/contracts/src/rpc.ts,packages/contracts/src/server.ts,packages/provider-copilot/src/server/adapter.test.ts,packages/provider-copilot/src/server/adapter.ts,packages/provider-copilot/src/server/driver.ts,packages/provider-copilot/src/server/status.test.ts,packages/provider-copilot/src/server/status.ts,packages/provider-copilot/src/settings.ts,packages/provider-core/src/server/ProviderAdapter.ts,packages/provider-core/src/server/driver.ts

## Change Summary

```
 README.md                                          |   3 +
 apps/server/src/auth/RpcAuthorization.test.ts      |  48 ++++
 apps/server/src/auth/RpcAuthorization.ts           |   1 +
 .../server/src/observability/RpcInstrumentation.ts |   1 +
 apps/server/src/provider/ProviderRegistry.test.ts  |  51 +++-
 apps/server/src/provider/ProviderRegistry.ts       | 108 ++++++-
 .../src/provider/providerMaintenanceRunner.test.ts |   1 +
 .../src/provider/testUtils/providerRegistryMock.ts |   1 +
 apps/server/src/serverSettings.test.ts             |  12 +-
 apps/server/src/ws.ts                              |   2 +
 .../src/components/chat/composerProviderState.tsx  |  12 +-
 apps/web/src/index.css                             |  26 +-
 docs/user/providers-copilot.md                     |   7 +-
 .../src/state/commandPermissions.test.ts           |  12 +-
 packages/contracts/src/clientRpcPermissions.ts     |   2 +
 packages/contracts/src/rpc.ts                      |  10 +
 packages/contracts/src/server.ts                   |  35 +++
 .../provider-copilot/src/server/adapter.test.ts    | 309 ++++++++++++++++++++-
 packages/provider-copilot/src/server/adapter.ts    | 232 +++++++++++++++-
 packages/provider-copilot/src/server/driver.ts     |   3 +-
 .../provider-copilot/src/server/status.test.ts     |  20 +-
 packages/provider-copilot/src/server/status.ts     | 136 +++++----
 packages/provider-copilot/src/settings.ts          |  18 +-
 .../provider-core/src/server/ProviderAdapter.ts    |   5 +
 packages/provider-core/src/server/driver.ts        |   2 +
 25 files changed, 953 insertions(+), 104 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: README.md, apps/server/src/auth/RpcAuthorization.test.ts, apps/server/src/auth/RpcAuthorization.ts, apps/server/src/observability/RpcInstrumentation.ts, apps/server/src/provider/ProviderRegistry.test.ts, apps/server/src/provider/ProviderRegistry.ts, apps/server/src/provider/providerMaintenanceRunner.test.ts, apps/server/src/provider/testUtils/providerRegistryMock.ts, apps/server/src/serverSettings.test.ts, apps/server/src/ws.ts, apps/web/src/components/chat/composerProviderState.tsx, apps/web/src/index.css, docs/user/providers-copilot.md, packages/client-runtime/src/state/commandPermissions.test.ts, packages/contracts/src/clientRpcPermissions.ts, packages/contracts/src/rpc.ts, packages/contracts/src/server.ts, packages/provider-copilot/src/server/adapter.test.ts, packages/provider-copilot/src/server/adapter.ts, packages/provider-copilot/src/server/driver.ts, packages/provider-copilot/src/server/status.test.ts, packages/provider-copilot/src/server/status.ts, packages/provider-copilot/src/settings.ts, packages/provider-core/src/server/ProviderAdapter.ts, packages/provider-core/src/server/driver.ts
- **claim_ids**: (none)
- **base_commit**: `5751f36722f20c9e974433092d55dfe85e017ed5`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/stable-main-preservation-v014/artifacts/post-apply.patch
```

