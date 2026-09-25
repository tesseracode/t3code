# Implementation Record: phase1-foundation

**Recorded**: 2026-09-25T13:46:38Z
**Files changed**: 34
**Patch size**: 204218 bytes
**Capture mode**: committed-range
**Base commit**: 7b5f4af3501d89b42b840f875917c09db4f786ce
**Upper bound**: 70d71759385de7a2b62b4d552f0290eebd33b804
**Pathspecs**: apps/server/src/orchestration/Layers/ProjectionPipeline.test.ts,apps/server/src/orchestration/Layers/ProjectionPipeline.ts,apps/server/src/orchestration/ThreadAttentionAudit.test.ts,apps/server/src/orchestration/ThreadAttentionAudit.ts,apps/server/src/persistence/ForkMigrations.test.ts,apps/server/src/persistence/ForkMigrations.ts,apps/server/src/persistence/ForkMigrations/044_ProjectionThreadAttentionAudit.test.ts,apps/server/src/persistence/ForkMigrations/044_ProjectionThreadAttentionAudit.ts,apps/server/src/persistence/ForkMigrations/045_TwsBindings.test.ts,apps/server/src/persistence/ForkMigrations/045_TwsBindings.ts,apps/server/src/persistence/Layers/ProjectionThreadAttentionAudit.test.ts,apps/server/src/persistence/Layers/ProjectionThreadAttentionAudit.ts,apps/server/src/persistence/Layers/TwsBindings.test.ts,apps/server/src/persistence/Layers/TwsBindings.ts,apps/server/src/persistence/Migrations.ts,apps/server/src/persistence/Services/ProjectionThreadAttentionAudit.ts,apps/server/src/persistence/Services/TwsBindings.ts,apps/server/src/tws/TwsBindingMatch.test.ts,apps/server/src/tws/TwsBindingMatch.ts,apps/server/src/tws/TwsCliAdapter.test.ts,apps/server/src/tws/TwsCliAdapter.ts,apps/server/src/tws/TwsCliDecoder.test.ts,apps/server/src/tws/TwsCliDecoder.ts,docs/internals/overview.md,docs/user/updating.md,packages/contracts/src/environment.test.ts,packages/contracts/src/environment.ts,packages/contracts/src/index.ts,packages/contracts/src/orchestration.test.ts,packages/contracts/src/orchestration.ts,packages/contracts/src/twsBindings.test.ts,packages/contracts/src/twsBindings.ts,packages/contracts/src/workItem.test.ts,packages/contracts/src/workItem.ts

## Capture Provenance

- **capture_mode**: `committed-range`
- **pathspecs**: apps/server/src/orchestration/Layers/ProjectionPipeline.test.ts, apps/server/src/orchestration/Layers/ProjectionPipeline.ts, apps/server/src/orchestration/ThreadAttentionAudit.test.ts, apps/server/src/orchestration/ThreadAttentionAudit.ts, apps/server/src/persistence/ForkMigrations.test.ts, apps/server/src/persistence/ForkMigrations.ts, apps/server/src/persistence/ForkMigrations/044_ProjectionThreadAttentionAudit.test.ts, apps/server/src/persistence/ForkMigrations/044_ProjectionThreadAttentionAudit.ts, apps/server/src/persistence/ForkMigrations/045_TwsBindings.test.ts, apps/server/src/persistence/ForkMigrations/045_TwsBindings.ts, apps/server/src/persistence/Layers/ProjectionThreadAttentionAudit.test.ts, apps/server/src/persistence/Layers/ProjectionThreadAttentionAudit.ts, apps/server/src/persistence/Layers/TwsBindings.test.ts, apps/server/src/persistence/Layers/TwsBindings.ts, apps/server/src/persistence/Migrations.ts, apps/server/src/persistence/Services/ProjectionThreadAttentionAudit.ts, apps/server/src/persistence/Services/TwsBindings.ts, apps/server/src/tws/TwsBindingMatch.test.ts, apps/server/src/tws/TwsBindingMatch.ts, apps/server/src/tws/TwsCliAdapter.test.ts, apps/server/src/tws/TwsCliAdapter.ts, apps/server/src/tws/TwsCliDecoder.test.ts, apps/server/src/tws/TwsCliDecoder.ts, docs/internals/overview.md, docs/user/updating.md, packages/contracts/src/environment.test.ts, packages/contracts/src/environment.ts, packages/contracts/src/index.ts, packages/contracts/src/orchestration.test.ts, packages/contracts/src/orchestration.ts, packages/contracts/src/twsBindings.test.ts, packages/contracts/src/twsBindings.ts, packages/contracts/src/workItem.test.ts, packages/contracts/src/workItem.ts
- **claim_ids**: (none)
- **base_commit**: `7b5f4af3501d89b42b840f875917c09db4f786ce`
- **upper_commit**: `70d71759385de7a2b62b4d552f0290eebd33b804`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/phase1-foundation/artifacts/post-apply.patch
```

*Patch was captured as a committed diff from `7b5f4af3501d89b42b840f875917c09db4f786ce` to `HEAD`.*
