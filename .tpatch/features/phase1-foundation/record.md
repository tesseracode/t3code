# Implementation Record: phase1-foundation

**Recorded**: 2026-10-29T08:38:59Z
**Files changed**: 92
**Patch size**: 543941 bytes
**Capture mode**: working-tree-all
**Pathspecs**: apps/mobile/src/state/attention.ts,apps/mobile/src/state/tws.ts,apps/server/src/auth/RpcAuthorization.ts,apps/server/src/environment/ServerEnvironment.ts,apps/server/src/observability/RpcInstrumentation.ts,apps/server/src/orchestration-v2/AttentionEvidence.ts,apps/server/src/orchestration-v2/AttentionSync.ts,apps/server/src/orchestration-v2/EffectWorker.test.ts,apps/server/src/orchestration-v2/EffectWorker.ts,apps/server/src/orchestration-v2/EventSink.ts,apps/server/src/orchestration-v2/FoundationProjection.test.ts,apps/server/src/orchestration-v2/FoundationProjection.ts,apps/server/src/orchestration-v2/Orchestrator.ts,apps/server/src/orchestration-v2/ProjectionMaintenance.ts,apps/server/src/persistence/ForkMigrations.test.ts,apps/server/src/persistence/ForkMigrations.ts,apps/server/src/persistence/ForkMigrations/044_ProjectionThreadAttentionAudit.test.ts,apps/server/src/persistence/ForkMigrations/044_ProjectionThreadAttentionAudit.ts,apps/server/src/persistence/ForkMigrations/045_TwsBindings.test.ts,apps/server/src/persistence/ForkMigrations/045_TwsBindings.ts,apps/server/src/persistence/ForkMigrations/046_ProjectionThreadAttentionCurrent.ts,apps/server/src/persistence/ForkMigrations/047_ProjectionThreadAwareness.ts,apps/server/src/persistence/ForkMigrations/048_AttentionDelivery.ts,apps/server/src/persistence/ForkMigrations/049_TwsContext.ts,apps/server/src/persistence/ForkMigrations/050_FoundationV2.ts,apps/server/src/persistence/Layers/ProjectionThreadAttentionAudit.test.ts,apps/server/src/persistence/Layers/ProjectionThreadAttentionAudit.ts,apps/server/src/persistence/Layers/ProjectionThreadAttentionCurrent.ts,apps/server/src/persistence/Layers/TwsBindings.test.ts,apps/server/src/persistence/Layers/TwsBindings.ts,apps/server/src/persistence/Migrations.test.ts,apps/server/src/persistence/Migrations.ts,apps/server/src/persistence/OrchestrationEventStore.ts,apps/server/src/persistence/Services/ProjectionThreadAttentionAudit.ts,apps/server/src/persistence/Services/ProjectionThreadAttentionCurrent.ts,apps/server/src/persistence/Services/TwsBindings.ts,apps/server/src/server.ts,apps/server/src/serverRuntimeStartup.autoPull.test.ts,apps/server/src/serverRuntimeStartup.test.ts,apps/server/src/serverRuntimeStartup.ts,apps/server/src/tws/TwsBindingMatch.test.ts,apps/server/src/tws/TwsBindingMatch.ts,apps/server/src/tws/TwsCliAdapter.test.ts,apps/server/src/tws/TwsCliAdapter.ts,apps/server/src/tws/TwsCliDecoder.test.ts,apps/server/src/tws/TwsCliDecoder.ts,apps/server/src/tws/TwsContextInference.ts,apps/server/src/tws/TwsContextModel.ts,apps/server/src/tws/TwsContextService.test.ts,apps/server/src/tws/TwsContextService.ts,apps/server/src/tws/TwsContextStore.ts,apps/server/src/tws/TwsExecutionResolver.ts,apps/server/src/tws/TwsTopology.test.ts,apps/server/src/tws/TwsTopology.ts,apps/server/src/tws/TwsTopologyRefresh.ts,apps/server/src/tws/runtimeLayer.ts,apps/server/src/ws.test.ts,apps/server/src/ws.ts,apps/web/src/components/settings/TwsIntegrationSettings.tsx,apps/web/src/components/settings/WorktreesSettings.tsx,apps/web/src/components/settings/settingsSearch.ts,apps/web/src/state/attention.ts,apps/web/src/state/tws.ts,docs/internals/foundation.md,docs/internals/tws-context.md,docs/user/tws.md,packages/client-runtime/package.json,packages/client-runtime/src/attentionSync.test.ts,packages/client-runtime/src/attentionSync.ts,packages/client-runtime/src/rpc/client.ts,packages/client-runtime/src/state/attention.test.ts,packages/client-runtime/src/state/attention.ts,packages/client-runtime/src/state/attentionNotifications.test.ts,packages/client-runtime/src/state/attentionNotifications.ts,packages/client-runtime/src/state/attentionProjection.ts,packages/client-runtime/src/state/tws.ts,packages/contracts/src/attention.test.ts,packages/contracts/src/attention.ts,packages/contracts/src/attentionSync.test.ts,packages/contracts/src/attentionSync.ts,packages/contracts/src/clientRpcPermissions.ts,packages/contracts/src/environment.ts,packages/contracts/src/index.ts,packages/contracts/src/orchestrationV2.ts,packages/contracts/src/rpc.ts,packages/contracts/src/settings.ts,packages/contracts/src/twsBindings.test.ts,packages/contracts/src/twsBindings.ts,packages/contracts/src/twsContext.test.ts,packages/contracts/src/twsContext.ts,packages/contracts/src/workItem.test.ts,packages/contracts/src/workItem.ts

## Change Summary

```
 apps/server/src/auth/RpcAuthorization.ts           |  5 ++
 apps/server/src/environment/ServerEnvironment.ts   |  2 +
 .../server/src/observability/RpcInstrumentation.ts |  6 ++
 .../src/orchestration-v2/EffectWorker.test.ts      | 32 ++++++++
 apps/server/src/orchestration-v2/EffectWorker.ts   |  8 ++
 apps/server/src/orchestration-v2/EventSink.ts      | 16 +++-
 apps/server/src/orchestration-v2/Orchestrator.ts   | 40 +++++++---
 .../src/orchestration-v2/ProjectionMaintenance.ts  |  5 +-
 apps/server/src/persistence/Migrations.test.ts     | 14 ++--
 apps/server/src/persistence/Migrations.ts          | 93 ++++++++++++++--------
 .../src/persistence/OrchestrationEventStore.ts     |  7 ++
 apps/server/src/server.ts                          | 10 ++-
 .../src/serverRuntimeStartup.autoPull.test.ts      |  4 +
 apps/server/src/serverRuntimeStartup.test.ts       |  4 +
 apps/server/src/serverRuntimeStartup.ts            |  4 +
 apps/server/src/ws.test.ts                         |  4 +
 apps/server/src/ws.ts                              | 21 +++++
 .../src/components/settings/WorktreesSettings.tsx  |  2 +
 apps/web/src/components/settings/settingsSearch.ts |  7 ++
 packages/client-runtime/package.json               | 12 +++
 packages/client-runtime/src/rpc/client.ts          |  1 +
 packages/contracts/src/clientRpcPermissions.ts     |  1 +
 packages/contracts/src/environment.ts              |  6 ++
 packages/contracts/src/index.ts                    |  5 ++
 packages/contracts/src/orchestrationV2.ts          |  3 +-
 packages/contracts/src/rpc.ts                      | 55 +++++++++++++
 packages/contracts/src/settings.ts                 |  2 +
 27 files changed, 313 insertions(+), 56 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: apps/mobile/src/state/attention.ts, apps/mobile/src/state/tws.ts, apps/server/src/auth/RpcAuthorization.ts, apps/server/src/environment/ServerEnvironment.ts, apps/server/src/observability/RpcInstrumentation.ts, apps/server/src/orchestration-v2/AttentionEvidence.ts, apps/server/src/orchestration-v2/AttentionSync.ts, apps/server/src/orchestration-v2/EffectWorker.test.ts, apps/server/src/orchestration-v2/EffectWorker.ts, apps/server/src/orchestration-v2/EventSink.ts, apps/server/src/orchestration-v2/FoundationProjection.test.ts, apps/server/src/orchestration-v2/FoundationProjection.ts, apps/server/src/orchestration-v2/Orchestrator.ts, apps/server/src/orchestration-v2/ProjectionMaintenance.ts, apps/server/src/persistence/ForkMigrations.test.ts, apps/server/src/persistence/ForkMigrations.ts, apps/server/src/persistence/ForkMigrations/044_ProjectionThreadAttentionAudit.test.ts, apps/server/src/persistence/ForkMigrations/044_ProjectionThreadAttentionAudit.ts, apps/server/src/persistence/ForkMigrations/045_TwsBindings.test.ts, apps/server/src/persistence/ForkMigrations/045_TwsBindings.ts, apps/server/src/persistence/ForkMigrations/046_ProjectionThreadAttentionCurrent.ts, apps/server/src/persistence/ForkMigrations/047_ProjectionThreadAwareness.ts, apps/server/src/persistence/ForkMigrations/048_AttentionDelivery.ts, apps/server/src/persistence/ForkMigrations/049_TwsContext.ts, apps/server/src/persistence/ForkMigrations/050_FoundationV2.ts, apps/server/src/persistence/Layers/ProjectionThreadAttentionAudit.test.ts, apps/server/src/persistence/Layers/ProjectionThreadAttentionAudit.ts, apps/server/src/persistence/Layers/ProjectionThreadAttentionCurrent.ts, apps/server/src/persistence/Layers/TwsBindings.test.ts, apps/server/src/persistence/Layers/TwsBindings.ts, apps/server/src/persistence/Migrations.test.ts, apps/server/src/persistence/Migrations.ts, apps/server/src/persistence/OrchestrationEventStore.ts, apps/server/src/persistence/Services/ProjectionThreadAttentionAudit.ts, apps/server/src/persistence/Services/ProjectionThreadAttentionCurrent.ts, apps/server/src/persistence/Services/TwsBindings.ts, apps/server/src/server.ts, apps/server/src/serverRuntimeStartup.autoPull.test.ts, apps/server/src/serverRuntimeStartup.test.ts, apps/server/src/serverRuntimeStartup.ts, apps/server/src/tws/TwsBindingMatch.test.ts, apps/server/src/tws/TwsBindingMatch.ts, apps/server/src/tws/TwsCliAdapter.test.ts, apps/server/src/tws/TwsCliAdapter.ts, apps/server/src/tws/TwsCliDecoder.test.ts, apps/server/src/tws/TwsCliDecoder.ts, apps/server/src/tws/TwsContextInference.ts, apps/server/src/tws/TwsContextModel.ts, apps/server/src/tws/TwsContextService.test.ts, apps/server/src/tws/TwsContextService.ts, apps/server/src/tws/TwsContextStore.ts, apps/server/src/tws/TwsExecutionResolver.ts, apps/server/src/tws/TwsTopology.test.ts, apps/server/src/tws/TwsTopology.ts, apps/server/src/tws/TwsTopologyRefresh.ts, apps/server/src/tws/runtimeLayer.ts, apps/server/src/ws.test.ts, apps/server/src/ws.ts, apps/web/src/components/settings/TwsIntegrationSettings.tsx, apps/web/src/components/settings/WorktreesSettings.tsx, apps/web/src/components/settings/settingsSearch.ts, apps/web/src/state/attention.ts, apps/web/src/state/tws.ts, docs/internals/foundation.md, docs/internals/tws-context.md, docs/user/tws.md, packages/client-runtime/package.json, packages/client-runtime/src/attentionSync.test.ts, packages/client-runtime/src/attentionSync.ts, packages/client-runtime/src/rpc/client.ts, packages/client-runtime/src/state/attention.test.ts, packages/client-runtime/src/state/attention.ts, packages/client-runtime/src/state/attentionNotifications.test.ts, packages/client-runtime/src/state/attentionNotifications.ts, packages/client-runtime/src/state/attentionProjection.ts, packages/client-runtime/src/state/tws.ts, packages/contracts/src/attention.test.ts, packages/contracts/src/attention.ts, packages/contracts/src/attentionSync.test.ts, packages/contracts/src/attentionSync.ts, packages/contracts/src/clientRpcPermissions.ts, packages/contracts/src/environment.ts, packages/contracts/src/index.ts, packages/contracts/src/orchestrationV2.ts, packages/contracts/src/rpc.ts, packages/contracts/src/settings.ts, packages/contracts/src/twsBindings.test.ts, packages/contracts/src/twsBindings.ts, packages/contracts/src/twsContext.test.ts, packages/contracts/src/twsContext.ts, packages/contracts/src/workItem.test.ts, packages/contracts/src/workItem.ts
- **claim_ids**: (none)
- **base_commit**: `81c2157c19b6984d2d76365bf243d1ae90f61548`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/phase1-foundation/artifacts/post-apply.patch
```
