# Implementation Record: copilot-skill-controls-v014

**Recorded**: 2026-11-06T05:28:56Z
**Files changed**: 16
**Patch size**: 35652 bytes
**Capture mode**: working-tree-all
**Pathspecs**: apps/server/src/auth/RpcAuthorization.test.ts,apps/server/src/auth/RpcAuthorization.ts,apps/server/src/observability/RpcInstrumentation.ts,apps/server/src/provider/ProviderRegistry.test.ts,apps/server/src/provider/ProviderRegistry.ts,apps/server/src/provider/providerMaintenanceRunner.test.ts,apps/server/src/provider/testUtils/providerRegistryMock.ts,apps/server/src/ws.ts,docs/user/providers-copilot.md,packages/client-runtime/src/state/commandPermissions.test.ts,packages/contracts/src/clientRpcPermissions.ts,packages/contracts/src/rpc.ts,packages/contracts/src/server.ts,packages/provider-copilot/src/server/adapter.test.ts,packages/provider-copilot/src/server/adapter.ts,packages/provider-core/src/server/ProviderAdapter.ts

## Change Summary

```
 apps/server/src/auth/RpcAuthorization.test.ts      |  48 +++++++
 apps/server/src/auth/RpcAuthorization.ts           |   1 +
 .../server/src/observability/RpcInstrumentation.ts |   1 +
 apps/server/src/provider/ProviderRegistry.test.ts  |  40 +++++-
 apps/server/src/provider/ProviderRegistry.ts       |  55 ++++++++
 .../src/provider/providerMaintenanceRunner.test.ts |   1 +
 .../src/provider/testUtils/providerRegistryMock.ts |   1 +
 apps/server/src/ws.ts                              |   2 +
 docs/user/providers-copilot.md                     |   3 +-
 .../src/state/commandPermissions.test.ts           |  12 +-
 packages/contracts/src/clientRpcPermissions.ts     |   2 +
 packages/contracts/src/rpc.ts                      |  10 ++
 packages/contracts/src/server.ts                   |  35 +++++
 .../provider-copilot/src/server/adapter.test.ts    | 150 ++++++++++++++++++++-
 packages/provider-copilot/src/server/adapter.ts    |  72 +++++++++-
 .../provider-core/src/server/ProviderAdapter.ts    |   5 +
 16 files changed, 427 insertions(+), 11 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: apps/server/src/auth/RpcAuthorization.test.ts, apps/server/src/auth/RpcAuthorization.ts, apps/server/src/observability/RpcInstrumentation.ts, apps/server/src/provider/ProviderRegistry.test.ts, apps/server/src/provider/ProviderRegistry.ts, apps/server/src/provider/providerMaintenanceRunner.test.ts, apps/server/src/provider/testUtils/providerRegistryMock.ts, apps/server/src/ws.ts, docs/user/providers-copilot.md, packages/client-runtime/src/state/commandPermissions.test.ts, packages/contracts/src/clientRpcPermissions.ts, packages/contracts/src/rpc.ts, packages/contracts/src/server.ts, packages/provider-copilot/src/server/adapter.test.ts, packages/provider-copilot/src/server/adapter.ts, packages/provider-core/src/server/ProviderAdapter.ts
- **claim_ids**: (none)
- **base_commit**: `e6d01c63390dbba90f74557ef877f44a6893a375`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-skill-controls-v014/artifacts/post-apply.patch
```

