# v0.1.4 Foundation replay: post-landing per-file source review

- Landing: `c36a114404f0dcd90e0ec39d410d1043d12547b1`; actual base: `8605454d5cba4ab065f43fa694e62868fe093e31`.
- Authoritative canonical source: `69959d14397bd6a680d474e05827f18ea50f571e` (latest reviewed v013 root).
- Canonical input patch SHA-256: `89822db2cae70bd24f730fb49d2c99c055edd4d2c6af3a3fe4e56abaffe36ad8`.
- Recorded patch SHA-256: `0ff017d936d51ba53c48b2c91eb8d250ee47c932c4d194c71fccb0733b6f043c`.
- Recipe SHA-256: `4faef0270a0d1158331829689f018dafd9fc9416653ec5e809f3359e27839d0e`.

## Coverage and actual reconciliation

All 92 canonical product paths materialized; no canonical path omitted or silently marked absorbed. One added v014 adaptation path (`packages/client-runtime/src/state/commandPermissions.test.ts`) yields 93 product paths. Actual source/diff inspected for every path after this root and post-landing blob hashes rechecked before starting the child. New source was read directly; existing long files were reviewed at changed seams; test source/fixtures/assertions were inspected, not executed.

`tpatch reconcile phase1-foundation --upstream-ref v0.1.4 --format json` exited 1 before reconciliation: hard Native parent snapshot16 vs `pg_46e3399bbab9`; soft Search snapshot9 vs `pg_b03a657c573c`. Actual refusal preserved in `v014-reconcile-refusal.txt`; verbose status/next outputs retained locally. `apply --mode started` exited 0, and `apply --mode done` bound the genuine target base. No unchanged parent refreshed; no parent snapshot or generation manifest hand-edited.

Authoritative three-way application exited 1 with exactly two textual conflicts: `packages/contracts/src/rpc.ts` (retired project registry API adjacency) and `packages/client-runtime/src/rpc/client.ts` (retired Codex-specific auth subscription). Resolutions retain v014 project registry and shared provider-auth APIs and add only Foundation methods. Other merges were clean. TWS effect explanation was updated to the current lint rule; destination permission regression table gained one TWS row.

Upstream manifest entries and migration source 070 PeerLinks / 071 PeerLinkFence / 072 WaitingLinkRequestIndex are intact, as are `orchestration-v2/runtimeLayer.ts`, the v014 EventSink delegated-completion guards, shared provider registry and peer-link ownership. Foundation adds environment-local projection evidence, not foreign-thread state ownership. Upstream permissive site-local migration-name behavior is intentionally narrowed by the canonical Foundation legacy-lineage safety contract; its tests explicitly document that policy difference.

## Structural evidence, not behavioral validation

`tpatch record phase1-foundation --staged` exited 0: 550591 bytes, 93 files, naturally appended `patches/026-record.patch`. Its later-touch warnings include historical claim paths absent from this actual patch; they are not omissions or newly touched Native files. Complete hand-authored recipe has 93 actual current-source contents and genuine baseline SHA-256 preimages; provenance explicitly says manual attestation, not provider-generated. Internal byte proof: canonical patch equals full HEAD-to-index binary diff; each recipe content equals landed source, every preimage equals its real baseline blob; reverse apply check succeeds.

`tpatch verify phase1-foundation` exited 2 before landing: V7 aborts because hard parent `copilot-cli-provider` has ambiguous landing evidence; V8/V10 skipped. This is reported as a failed structural verifier, not a passing test, no fabricated evidence or blanket policy waiver. Exact internal replay proof is independent of that verifier's parent selection. Existing older `test-output.txt` is historical v013 evidence, not v014 execution.

No tests/typechecks/builds/provider turns/dev servers/browser/simulator/platform qualification were run, by maintainer instruction until all roots integrate. Linux, Windows and WSL execution, mobile presentation, client visual/reviewer passes remain later gates; no push, mobile notification, relay delivery, native emitter or permission change claimed.

## Per-file review and byte hashes

Each entry records actual base / landed SHA-256 (`absent` means new). `canonical exact` means full bytes match the authoritative source commit; otherwise upstream baseline and scoped additions were reconciled rather than replacing the file.

- `apps/mobile/src/state/attention.ts` — **canonical exact**. Scoped request/lifecycle identities or lazy shared client workspace export; current run identity is not a provider turn.
  - base `absent`; landed `9eeed4917c626acc293212efa6d3e6788593a3f19ecd9beba4a4eac517b72c3d`.
- `apps/mobile/src/state/tws.ts` — **canonical exact**. Lazy environment-lease client commands/query atoms; setContext uses new upstream protected-command boundary.
  - base `absent`; landed `3b6e4d6670ebd44ea1899b3fbd3224803c3c853d22157b02881516690de89d4b`.
- `apps/server/src/auth/RpcAuthorization.ts` — **v014 reconciled**. Read-only attention/TWS scopes added; protected setContext scope delegates to v014 CLIENT_GUARDED_RPC_SCOPES.
  - base `067aa42ae50d801084b99dd36d40f8706d58af7936ce92384ddfde9e4279269e`; landed `a710a92e78364a403dba970434d13485e569fe4856e6f9e24e9b2aacc70a45fd`.
- `apps/server/src/environment/ServerEnvironment.ts` — **v014 reconciled**. Advertises only actual attentionSync and twsContext APIs.
  - base `1c2252ca5756352176e68bd568988a1c2abf3b4d2075c52909489ce175d02397`; landed `713a4319730cce12f1c3f4272a8059c759daff0b952a246f52f3e01ac2ae5926`.
- `apps/server/src/observability/RpcInstrumentation.ts` — **v014 reconciled**. Adds closed aggregate labels for six methods; no payload logging.
  - base `c94b9b8058237adf27e50244f5afc60e6437bf17506795afb9294fe7d1de5461`; landed `fceedfaef9224df169aff37e326977fc42cd254fea49409d79023e2163513602`.
- `apps/server/src/orchestration-v2/AttentionEvidence.ts` — **canonical exact**. Compact internal evidence explicitly distinguishes run authority from provider liveness.
  - base `absent`; landed `d65f48ecdf941bd16c7bf670e6bdb7fed267edf45154d7a6bfb9423482317cd2`.
- `apps/server/src/orchestration-v2/AttentionSync.ts` — **canonical exact**. Signed environment/session/filter tokens; owned pages/replay/fence/live stream; bounded transactional journal and post-commit wakeups.
  - base `absent`; landed `c45ad7db85f21d89103cea7d90169727c8c19f10d63c3f4d4bb72bf0842050db`.
- `apps/server/src/orchestration-v2/EffectWorker.test.ts` — **v014 reconciled**. Adds successful delivery receipt assertion to existing effect-worker tests; upstream cases retained.
  - base `d745ca2a6486a997995bcca42399c411a80f14b6cf37157fb9a220d2e79fdc17`; landed `17ad62e0d93cac8350f9d5949f0a8e9771bda6786e678f360eb5423daa1aaf09`.
- `apps/server/src/orchestration-v2/EffectWorker.ts` — **v014 reconciled**. Native request delivery emits confirmation only after success, retaining upstream interruption/final-retry failure handling.
  - base `931090643aa76516831af5ce9b03f5313230ac7c0433e1b5c460e62f1a9124db`; landed `ab4925e27c3fecc85447c0354a2daff99475a887305573b856dbc47d12c29f32`.
- `apps/server/src/orchestration-v2/EventSink.ts` — **v014 reconciled**. Foundation projection shares canonical write transaction including project deletion; v014 delegatedCompletion merge guard retained unchanged.
  - base `337d3720fc2ddd97408024bdb0022c0937e17f00611a7beb8707bc7fca00eeaf`; landed `ba11800789795388e6923c4530acddbe6d102f376b488688eb5c7e16612da95f`.
- `apps/server/src/orchestration-v2/FoundationProjection.test.ts` — **canonical exact**. Retains continuation/retry/arrival-order/null-owner/child isolation cases plus request delivery, rollback, counts and committed-stream assertions.
  - base `absent`; landed `a03adc3424efc27694c910b0b83bf90b6a38a0bd03d1201700f3186d6ee186ea`.
- `apps/server/src/orchestration-v2/FoundationProjection.ts` — **canonical exact**. V2 owning run maps to compatibility turnId; audit retains native turn; unknown owners stay null; provider terminal does not fence a continuing run.
  - base `absent`; landed `7fc7b0e753d6b5eb948905b8d66da1a9cb42b8e125d55b59da5dbb6e9b5cf829`.
- `apps/server/src/orchestration-v2/Orchestrator.ts` — **v014 reconciled**. Response delivery pending/confirmed/failed remains distinct from intent; v014 peer links/shared provider registry and upstream work retained.
  - base `6205c61cfadd35d74636c19891b236ca7cb61fc993f42b950c7d80b1031fe704`; landed `925e8e96eba8017d8c5b6d96c31ea5bfff5b32b7ae7a1f58cf6593b1834099ea`.
- `apps/server/src/orchestration-v2/ProjectionMaintenance.ts` — **canonical exact**. Derived attention rebuild composes inside existing transaction; ordinary V2 maintenance remains intact.
  - base `7392b3eaa2310e98fcdbb6c56bc60b4042f11ea7ea19c68c2fc91fed40b0918f`; landed `863b81cee943473d3c6c9c1c626cd587a6fde382c52a6c81c91cc66347230590`.
- `apps/server/src/persistence/ForkMigrations.test.ts` — **canonical exact**. Fresh/idempotent, legacy provenance and recovered rows, advanced collisions, explicit unknown-history refusal, rollback/retry and disk-copy recovery.
  - base `absent`; landed `9e43a7325cd1c69c704e7abe194012846bef627e7f670024fb3243898a4a0539`.
- `apps/server/src/persistence/ForkMigrations.ts` — **canonical exact**. Separate contiguous fork ledger 044–050; exact legacy shared 044/045 provenance and schema; atomic execution of collided upstream migrations.
  - base `absent`; landed `c4d1b5801e4bdde87b746795904bee3a6b23edeb3fe95b400e4815feacf9be4f`.
- `apps/server/src/persistence/ForkMigrations/044_ProjectionThreadAttentionAudit.test.ts` — **canonical exact**. Separate fork schema only; upstream numbered migrations untouched. 044_ProjectionThreadAttentionAudit.test.ts
  - base `absent`; landed `d7e46e4fdaba47b2c6a7e714f8ee6964b79ff8f8867248444f2412d164dc1fbe`.
- `apps/server/src/persistence/ForkMigrations/044_ProjectionThreadAttentionAudit.ts` — **canonical exact**. Separate fork schema only; upstream numbered migrations untouched. 044_ProjectionThreadAttentionAudit.ts
  - base `absent`; landed `1f5d2ceb9248a5950388dde61c0b8f76f94cd9969ff7e949f7855abab3c7b2d6`.
- `apps/server/src/persistence/ForkMigrations/045_TwsBindings.test.ts` — **canonical exact**. Separate fork schema only; upstream numbered migrations untouched. 045_TwsBindings.test.ts
  - base `absent`; landed `105627cd7cb902db5bdb00352e796abdd4b1056514c0d6db62584f3d0f0acc5b`.
- `apps/server/src/persistence/ForkMigrations/045_TwsBindings.ts` — **canonical exact**. Separate fork schema only; upstream numbered migrations untouched. 045_TwsBindings.ts
  - base `absent`; landed `9eda2cda443606c1d4cc0f111a031ca8ded6a9117d4b33f771ebd6b21bdae9b8`.
- `apps/server/src/persistence/ForkMigrations/046_ProjectionThreadAttentionCurrent.ts` — **canonical exact**. Separate fork schema only; upstream numbered migrations untouched. 046_ProjectionThreadAttentionCurrent.ts
  - base `absent`; landed `816ad2e0a36cf05a155f2ec80105957e000c5c3d44521f1c3f649965507a8c30`.
- `apps/server/src/persistence/ForkMigrations/047_ProjectionThreadAwareness.ts` — **canonical exact**. Separate fork schema only; upstream numbered migrations untouched. 047_ProjectionThreadAwareness.ts
  - base `absent`; landed `9a79d4b2f5137a011e9c52ca8c3993a2d2e28908c7f1d3be7dbf11bcfbe6a090`.
- `apps/server/src/persistence/ForkMigrations/048_AttentionDelivery.ts` — **canonical exact**. Separate fork schema only; upstream numbered migrations untouched. 048_AttentionDelivery.ts
  - base `absent`; landed `73a8371eb0c49a82de2cfadb07934d197db9cdee376a8f43471fa695698cee99`.
- `apps/server/src/persistence/ForkMigrations/049_TwsContext.ts` — **canonical exact**. Separate fork schema only; upstream numbered migrations untouched. 049_TwsContext.ts
  - base `absent`; landed `0882302d17a10ea34843a2e1180fb1495d0cff6d136582e5061b245a0847a3d3`.
- `apps/server/src/persistence/ForkMigrations/050_FoundationV2.ts` — **canonical exact**. Separate fork schema only; upstream numbered migrations untouched. 050_FoundationV2.ts
  - base `absent`; landed `5ad5029f23e464e35353db36d5ae1a0e199945f06c11056cc0ad9f269b004b39`.
- `apps/server/src/persistence/Layers/ProjectionThreadAttentionAudit.test.ts` — **canonical exact**. Retained focused behavior assertions and fixtures for ProjectionThreadAttentionAudit; reviewed source, execution deferred.
  - base `absent`; landed `22561ac09d41054ca0926c90b9566246d2f641778b8fc47e9947d5e92eef9588`.
- `apps/server/src/persistence/Layers/ProjectionThreadAttentionAudit.ts` — **canonical exact**. Independent compact immutable-per-event audit, bounded reads; no prompt or raw provider error payload.
  - base `absent`; landed `87916b11a154e63be751b6f538b5deaef0c0da8f8b1dc1a51719a95c6af52c14`.
- `apps/server/src/persistence/Layers/ProjectionThreadAttentionCurrent.ts` — **canonical exact**. Independent mutable projector, request identity, lifecycle observation dedupe, authoritative terminal fences, saturated summaries and rebuild generation.
  - base `absent`; landed `c26ea6280dc0cee82ebd58189d964fa38a5f65c3374cadc799db53c769b89839`.
- `apps/server/src/persistence/Layers/TwsBindings.test.ts` — **canonical exact**. Retained focused behavior assertions and fixtures for TwsBindings; reviewed source, execution deferred.
  - base `absent`; landed `f95cf605691125a0a634a152ced52dc4323393d6ad167ad99434a161c0d4315f`.
- `apps/server/src/persistence/Layers/TwsBindings.ts` — **canonical exact**. Environment-composite keys, parent-scoped opaque binding persistence, retained locators, bounded reads and scoped cascade deletion.
  - base `absent`; landed `e84493f5c1b77777002609b54c596c9a6551b8576e4bb66bc9dc535e2ff732c5`.
- `apps/server/src/persistence/Migrations.test.ts` — **canonical exact**. Canonical stricter unknown-lineage cases retained; upstream v014 migration manifest remains source of expected migration range.
  - base `477ffa5ba83cd1b64965866f009299234c101bf43d26751c743ed868b3074a85`; landed `15954d1c10f537faa99b954b05943f8f764858e162736efd3e19d29bc09301f3`.
- `apps/server/src/persistence/Migrations.ts` — **v014 reconciled**. Atomic bridge and both migrators; upstream manifest through 072 and V2-preview safeguards preserved. Intentional Foundation policy rejects incompatible site-local lineage.
  - base `20f10156c3371ca1cad3e3819fd686ebe210cc76c6a5692102a2652dc0038804`; landed `3d4b432ee5a1f6c6adb1770036082058c617d201e2c0fccb308f4ca0ea850717`.
- `apps/server/src/persistence/OrchestrationEventStore.ts` — **canonical exact**. Adds scoped committed-event subscription to existing owner; no new publication authority or foreign data ownership.
  - base `3cd963e89ffa4bcea2302b934f7ed40bf4e4459689cc3daa270e67015952a870`; landed `60ba937f97465a9d88a3b336cd7afee2bbb29a8442d25ee8bde8e320dcb2624f`.
- `apps/server/src/persistence/Services/ProjectionThreadAttentionAudit.ts` — **canonical exact**. Independent compact immutable-per-event audit, bounded reads; no prompt or raw provider error payload.
  - base `absent`; landed `0486461bf8654fda970f9e19e9a8645a749d5b63cdd34146e41ecf33dae2ddea`.
- `apps/server/src/persistence/Services/ProjectionThreadAttentionCurrent.ts` — **canonical exact**. Independent mutable projector, request identity, lifecycle observation dedupe, authoritative terminal fences, saturated summaries and rebuild generation.
  - base `absent`; landed `91f4b3eddb8c9a97309682085b8e4594e2ca80be90b6d6fbeb32427c3d37603a`.
- `apps/server/src/persistence/Services/TwsBindings.ts` — **canonical exact**. Environment-composite keys, parent-scoped opaque binding persistence, retained locators, bounded reads and scoped cascade deletion.
  - base `absent`; landed `13e3e8836383ec59cbd472456dd25d3748aa4ccb161c3405fea968160616605a`.
- `apps/server/src/server.ts` — **v014 reconciled**. Adds sidecar layers over existing v014 runtime core; shared provider registry and environment ownership preserved.
  - base `4c6dd682aa144867a562c7706e44685a294494dc7b7c0d2c3a5d10943759d366`; landed `eaca0999d28083d9946b4a47526a00e51336a8f8dbf7b85ee02b2a0c14c982c8`.
- `apps/server/src/serverRuntimeStartup.autoPull.test.ts` — **canonical exact**. Retained focused behavior assertions and fixtures for serverRuntimeStartup.autoPull; reviewed source, execution deferred.
  - base `619f27a2fdd2582fec9e568bb29c1d6cf8f3370cf97cf8ed3a530c5d5767369e`; landed `c3039b70e06163c63d2e6f206128e90ae31cad5a7cc2dc8ce89454e461a53101`.
- `apps/server/src/serverRuntimeStartup.test.ts` — **canonical exact**. Retained focused behavior assertions and fixtures for serverRuntimeStartup; reviewed source, execution deferred.
  - base `c8e2719e1e43b9fe02fcd97b39c7a154f60f9b99a927b6f57ef98ce092525408`; landed `fbb49e3f8b9f94869c3ff90036c8bc162db2ae575c5df3aad2dd14a5047dc6fb`.
- `apps/server/src/serverRuntimeStartup.ts` — **canonical exact**. Foundation bootstrap precedes runtime readiness; optional TWS service starts on same environment.
  - base `9fbb5b3950113f80a42fb54682a2df83115887e53179a49387f827ff2a7d5357`; landed `4a6da7b3a6746b426966bf1f1cc95af33bdc54ae73c8d6b8639cc7163d97d0c4`.
- `apps/server/src/tws/TwsBindingMatch.test.ts` — **canonical exact**. Retained focused behavior assertions and fixtures for TwsBindingMatch; reviewed source, execution deferred.
  - base `absent`; landed `7b3a9a6c2dc644222b118923fac2e48f89747077e9b6c8d90355b13fcedb06ee`.
- `apps/server/src/tws/TwsBindingMatch.ts` — **canonical exact**. Opaque binding matching remains locator-based and ambiguity-safe; repository similarity does not merge identities.
  - base `absent`; landed `ed276fd0e24d02f04114516d0e336005735149d00db9a3125df9da57efe277dc`.
- `apps/server/src/tws/TwsCliAdapter.test.ts` — **canonical exact**. Retained focused behavior assertions and fixtures for TwsCliAdapter; reviewed source, execution deferred.
  - base `absent`; landed `172596eaf4b64456f33f5ccda8eb2a3371e5435437b3e5b9288423989a59e00e`.
- `apps/server/src/tws/TwsCliAdapter.ts` — **canonical exact**. Only pinned v1.2.14 read-only direct argv calls; refresh invalidates version cache, bounded process output and timeout.
  - base `absent`; landed `f7c9003932ecc37fb612d16ddb4489a98f99410eb77b9bac0139e2e77fe3ff9b`.
- `apps/server/src/tws/TwsCliDecoder.test.ts` — **canonical exact**. Retained focused behavior assertions and fixtures for TwsCliDecoder; reviewed source, execution deferred.
  - base `absent`; landed `d0c8e9b6d6516d27d005d049dfdfcff523c34f74229b8044a417a00ae74fecd3`.
- `apps/server/src/tws/TwsCliDecoder.ts` — **canonical exact**. Pinned version/schema and additive report decoding; invalid JSON/UTF-8/shape explicit; TWS agent-state never canonical attention.
  - base `absent`; landed `276e5c4bf5aeb641d14c302ce9eb1bd18b85c3b098c3bafc1d9a7ada93ca6b24`.
- `apps/server/src/tws/TwsContextInference.ts` — **canonical exact**. Explicit clear sticky, exact checkout proof conservative; unproved renamed features/nodes cannot silently replace association.
  - base `absent`; landed `339440fdadc7a13f8670d6823f4c6f8082d5dfd90625796d926a2619215b5e20`.
- `apps/server/src/tws/TwsContextModel.ts` — **canonical exact**. Environment-owned opaque context, separate observation/material revision and path-free compact topology entries.
  - base `absent`; landed `70780e1ef0619e8c9e31e4ad4d16cbcb1153b0ccff25e7135dd9cfe9e8ff446d`.
- `apps/server/src/tws/TwsContextService.test.ts` — **canonical exact**. Pinned CLI mock, explicit choices/marker conflicts, disabled bypass, cancellation, concurrent clear, partial topology and disk reopen assertions retained.
  - base `absent`; landed `e0a0e538d32695316c8727fcdb393b45376dae8ca81f8f43127867e943e0aa8d`.
- `apps/server/src/tws/TwsContextService.ts` — **canonical exact**. Off-by-default no CLI calls; one coalesced owned scan, disable cancellation, generation/incarnation guards, latest persisted choices and bounded queries.
  - base `absent`; landed `0c38f2cba2cedf8f75f9810cbeb402e9a3cfa3d35f2291b8abcb647183f41837`.
- `apps/server/src/tws/TwsContextStore.ts` — **canonical exact**. Environment-scoped sidecar storage with V2 thread/project incarnation and transactional optimistic observation writes.
  - base `absent`; landed `fc9151824512456d40f54e5de3b574b122dcc0284ed957984941d81924c4f294`.
- `apps/server/src/tws/TwsExecutionResolver.ts` — **canonical exact**. Server-local real paths and Git checkout/common-dir/branch evidence; no client or foreign-environment execution ownership.
  - base `absent`; landed `9effd5c7dd819b9c6b613514d607c1626c695be3d224dd1d867daafffc0b63de`.
- `apps/server/src/tws/TwsTopology.test.ts` — **canonical exact**. Retained focused behavior assertions and fixtures for TwsTopology; reviewed source, execution deferred.
  - base `absent`; landed `7086c48e8139db17fe7261613436bfe06a70e0b248363433bbcfd4554b246b2d`.
- `apps/server/src/tws/TwsTopology.ts` — **canonical exact**. Narrow public topology normalization validates counts and parent scope; archived/cross-repository/branch-only entries prove no execution.
  - base `absent`; landed `86bc8681383a21da64b1eca667a459cb2a798afda0c1113e48f7cbb371e9951b`.
- `apps/server/src/tws/TwsTopologyRefresh.ts` — **canonical exact**. Registry marker, not path-derived report stable_id, proves workspace continuity; conflicts require reassignment; independently complete scopes preserve positives.
  - base `absent`; landed `6acfe4fcdf2e8998c5bd351a249a067d82bd5f0e1cb96bb3dfcb98156a74226d`.
- `apps/server/src/tws/runtimeLayer.ts` — **canonical exact**. TWS-only local layer composition; existing orchestration provider registry untouched.
  - base `absent`; landed `c2fbc38d905647d2dcc00a88635de3c188c99517bad172e1ac89a669662bff92`.
- `apps/server/src/ws.test.ts` — **v014 reconciled**. Retained focused behavior assertions and fixtures for ws; reviewed source, execution deferred.
  - base `4434fb6faa506587a3483c34ac135ff82a7dfad3ccf11640610b8176d1a3e9f7`; landed `aa85d2a2a9cd19943e4ef0bed9379e4787c5e781dd657a512f3a98dbf9a2eaa4`.
- `apps/server/src/ws.ts` — **v014 reconciled**. Thin service handlers; saved TWS setting invalidates owned observation; existing v014 RPC implementations preserved.
  - base `bc7e126cb6f51087ea282ad76ad9c4341698fc1010e14fd42acf1a5accc95b55`; landed `ee9a01e3c3df41f461a79a768d4445296ac59f10982e0dc84635551c9e5cf4ef`.
- `apps/web/src/components/settings/TwsIntegrationSettings.tsx` — **v014 reconciled**. Per-environment opt-in and explicit refresh retained; effect explanation adapted to v014 no-unreasoned-state-sync rule.
  - base `absent`; landed `4925c0cf7a5dff2ebab31fd07cb54edb2dc744e350ba42227f1d16a8cc4e2ba3`.
- `apps/web/src/components/settings/WorktreesSettings.tsx` — **canonical exact**. TWS section added to existing environment settings without changing project-scope worktree behavior.
  - base `db858bba7ffa01d10d70ef1476bb7dc9b209236235d5bb43fe6294c4fce49fdc`; landed `174e031ccf4b93e88ed650d072261df53a4c778528f6095eb9792f9476db0b19`.
- `apps/web/src/components/settings/settingsSearch.ts` — **v014 reconciled**. One TWS environment-scoped search entry; all upstream settings routes retained.
  - base `db2d58d319b0cc7c492f73b63e78c2fba5be7f98b78660c7e9ae82daa42968e7`; landed `d17c61a3c2aa3d05938cb5eac62a5796d3ea7bdf89c0108f772cce5683cd9615`.
- `apps/web/src/state/attention.ts` — **canonical exact**. Scoped request/lifecycle identities or lazy shared client workspace export; current run identity is not a provider turn.
  - base `absent`; landed `9eeed4917c626acc293212efa6d3e6788593a3f19ecd9beba4a4eac517b72c3d`.
- `apps/web/src/state/tws.ts` — **canonical exact**. Lazy environment-lease client commands/query atoms; setContext uses new upstream protected-command boundary.
  - base `absent`; landed `3b6e4d6670ebd44ea1899b3fbd3224803c3c853d22157b02881516690de89d4b`.
- `docs/internals/foundation.md` — **canonical exact**. Documents V2 run authority, raw native audit identity, separated migration ledger and recovery boundary without platform claims.
  - base `absent`; landed `2daf4ba9504985d9c1a183c6d3d015727426cf091c657d01694f6571fa9235f0`.
- `docs/internals/tws-context.md` — **canonical exact**. Documents pinned public marker identity, environment-local evidence and off-by-default optional sidecar.
  - base `absent`; landed `ed14bf6bea8a5fb4e85514022395b9eaaff5a82bda25e9d7885ccd5169a09460`.
- `docs/user/tws.md` — **canonical exact**. User-facing opt-in, explicit refresh, disable/clear/auto behavior and native Windows/WSL limitations retained.
  - base `absent`; landed `bd1f5cc5c347bec3109c694b3b2b9989dcdae712e1cb0652880a643b8d00bf0c`.
- `packages/client-runtime/package.json` — **v014 reconciled**. Only three client-runtime subpath exports; dependencies and Native/packaging payload unchanged.
  - base `7f1c28b052b1810b37951ef36fed59aeb9454d1a107e7128334aedc4fa51928d`; landed `b15f4d9f04627829141b85e6a375d69d43bcac964959c3910a595a2debb04b29`.
- `packages/client-runtime/src/attentionSync.test.ts` — **canonical exact**. Retained focused behavior assertions and fixtures for attentionSync; reviewed source, execution deferred.
  - base `absent`; landed `50d8af892436c9ed6751a10ab1ba26fef5c962f9a9aa4228ce09e294c2769ca0`.
- `packages/client-runtime/src/attentionSync.ts` — **canonical exact**. Fenced protocol reducer or schemas; overlapping pages/tombstones staged until sync-complete and replay never eligible.
  - base `absent`; landed `846edec90fd7fbc7ac79c7f4c59c8406f93aec4a4b518166b8e1a3848e300ac3`.
- `packages/client-runtime/src/rpc/client.ts` — **v014 reconciled**. Attention subscription added beside upstream shared providerAuth; actual conflict removes obsolete codexAuthCallbackSubscribe.
  - base `a9ec3ec3b66648e3371e09ccaed0ae379d1fcde268e178c25e2d2aff6f6d6b6c`; landed `221598db030693efcf53a176aef12bb71929bcf7ef3bd4a4213ce632f2ff23de`.
- `packages/client-runtime/src/state/attention.test.ts` — **canonical exact**. Retained focused behavior assertions and fixtures for attention; reviewed source, execution deferred.
  - base `absent`; landed `ee4d0b2485a93cc3787cf561d3598d7df292ddbf23f3c604cc5a6a7e4d527620`.
- `packages/client-runtime/src/state/attention.ts` — **canonical exact**. Scoped request/lifecycle identities or lazy shared client workspace export; current run identity is not a provider turn.
  - base `absent`; landed `07ad774c75c1faf097a225a3d0384513db93e844fb75fd7805c161f6d3cd2c20`.
- `packages/client-runtime/src/state/attentionNotifications.test.ts` — **canonical exact**. Retained focused behavior assertions and fixtures for attentionNotifications; reviewed source, execution deferred.
  - base `absent`; landed `97699e5ddebc7c16aa1edba502375dcef66d38fafc88c8152e8937b21e223426`.
- `packages/client-runtime/src/state/attentionNotifications.ts` — **canonical exact**. Bounded still-current candidates survive batching; silent bootstrap/replay and same-run completion dedupe.
  - base `absent`; landed `1a4c9b60f90aaad19ea714d1d2dfd25dcd0b19776711b260a03d0c13a852faea`.
- `packages/client-runtime/src/state/attentionProjection.ts` — **canonical exact**. Multi-environment identities remain isolated; stale counts distinct, scoped filtering, deterministic priority and advisory-only relay hints.
  - base `absent`; landed `a3a7ec169126b481446c64e8ded8375095962507b3efd4364d82126705685c7e`.
- `packages/client-runtime/src/state/commandPermissions.test.ts` — **v014 reconciled**. New TWS row in existing destination-grant availability/execution test; not run at this stage.
  - base `438ed8fc58d45aca5f95fe3c92bcd4f7d727c56e5b35cef423c3588f840de717`; landed `0826deefd664c6e2cf62cea649296a991f0e797fcc06b09eb6337b33aa636ccf`.
- `packages/client-runtime/src/state/tws.ts` — **canonical exact**. Lazy environment-lease client commands/query atoms; setContext uses new upstream protected-command boundary.
  - base `absent`; landed `bc04038640972f12284952767bfe58ae9bf807b2db873c9613560a7246873985`.
- `packages/contracts/src/attention.test.ts` — **canonical exact**. Retained focused behavior assertions and fixtures for attention; reviewed source, execution deferred.
  - base `absent`; landed `8e1d02d1a90f3082486c9814d229da845642aaaf6b936f60ec80ecd5500ca895`.
- `packages/contracts/src/attention.ts` — **canonical exact**. Scoped request/lifecycle identities or lazy shared client workspace export; current run identity is not a provider turn.
  - base `absent`; landed `a306afc0d07f3b90c423ab40272a3e9b53ec1420a321a2518793a8b3aca9e8f3`.
- `packages/contracts/src/attentionSync.test.ts` — **canonical exact**. Retained focused behavior assertions and fixtures for attentionSync; reviewed source, execution deferred.
  - base `absent`; landed `352e0351e09f2ef7e8a304899cda3412f33004d00bff7f6b09d12e645e1ef705`.
- `packages/contracts/src/attentionSync.ts` — **canonical exact**. Fenced protocol reducer or schemas; overlapping pages/tombstones staged until sync-complete and replay never eligible.
  - base `absent`; landed `8dd3e23ce1dc4c29ec0c2252808580a7642dfeffe36d200515a3f5d2c4b1ca61`.
- `packages/contracts/src/clientRpcPermissions.ts` — **v014 reconciled**. Adds only tws.context.set orchestration-operate; preserves all v014 grants including peer links.
  - base `9f080b346699c395c9dab405ff39f55371982a41670b0950947402c45224ab1a`; landed `de0f29bd22c9b3e53e2a9ac8c30e2401c22bf43bb5aa30b10304180126be62a5`.
- `packages/contracts/src/environment.ts` — **v014 reconciled**. Optional attention/TWS/work-item capabilities preserve older servers; no implemented hosting or relay authority advertised.
  - base `f10d5d92ccb0851d7d868f6cd2ff9f1ab5bc07c553a12550e7c26fcd3f16bafa`; landed `23a8ce9e7105026fff211c72bbe03e870b0dc33165380e552b5a4252d34eb1d1`.
- `packages/contracts/src/index.ts` — **v014 reconciled**. Five additive contract exports, no change to existing exports.
  - base `07eb3780bd5c1519fa7a80581fdb3b33d47924a17d9807c41761879120b65eab`; landed `db15de913360e22a866464475a26322d2a8e08865ec1ae5dfd0576cefb4820c5`.
- `packages/contracts/src/orchestrationV2.ts` — **v014 reconciled**. Optional delivery status and internal confirm command only; v014 peer-link origin/remote children/search contracts preserved.
  - base `05b5edb13759e8395bf0d13423db01347a338f993a9d0a9db7c71207b1482704`; landed `3dfde35bc4c43638b011b49b02625c6ce46b022a2805bd99d281cc215068e2e0`.
- `packages/contracts/src/rpc.ts` — **v014 reconciled**. Only TWS/attention RPCs added. Actual conflict resolved without restoring retired projects.list/add/remove methods.
  - base `60429302fb4fcdfafa75dd112fa937c2dd53dc4bf9cfcbd7a67ad7404c7d85b8`; landed `23a87d6dac96544030d32f16211e4eee5ac33338fd1624ceeca5d344353b95a5`.
- `packages/contracts/src/settings.ts` — **v014 reconciled**. Server TWS default false; raw optional ServerSettingsPatch has no decoding default and cannot reset unrelated settings.
  - base `a52bb3bcd0203130db691ff6fbcecf15edf6cc9213ac311873d1a41903224ec0`; landed `8e9d033882e608b3d67ef0c45d91766060e5ebb28c22ec1398c9558b1dc69e50`.
- `packages/contracts/src/twsBindings.test.ts` — **canonical exact**. Retained focused behavior assertions and fixtures for twsBindings; reviewed source, execution deferred.
  - base `absent`; landed `5876bcb26a902452b05b9cc41f6034f8bd985a0fa43438a3ce8535d7940a8bf7`.
- `packages/contracts/src/twsBindings.ts` — **canonical exact**. Opaque workspace/feature/node IDs and bounded locator contracts remain environment-scoped, not repository-derived identity.
  - base `absent`; landed `bbb82cfd6efc9e8bda240f8fdf1cf0778037e5c119e2d169ac62e022bc9d2450`.
- `packages/contracts/src/twsContext.test.ts` — **canonical exact**. Retained focused behavior assertions and fixtures for twsContext; reviewed source, execution deferred.
  - base `absent`; landed `94a074482a81f6e73792e763bf626178c4a4ea2105623065586642e6ece901f9`.
- `packages/contracts/src/twsContext.ts` — **canonical exact**. Bounded environment-owned topology/context contracts; optimistic revision and explicit/none/auto choice, no client path authority.
  - base `absent`; landed `785c04f6cbf36940358dc530162cfffd6fa3f0d0baad69dcc095f497f12ad036`.
- `packages/contracts/src/workItem.test.ts` — **canonical exact**. Retained focused behavior assertions and fixtures for workItem; reviewed source, execution deferred.
  - base `absent`; landed `a7a973291036a2b48108dd17f1b997cce8c94541e5d5afcdc3ad72529e87723b`.
- `packages/contracts/src/workItem.ts` — **canonical exact**. Provider-neutral GitHub Issue/Azure Boards schemas only, no hosting implementation.
  - base `absent`; landed `e5865648be67cf1f351ef791eb018b1b82d746bb0abbc9e2637ee6af03402a89`.

## Later smallest selectors (prepared, NOT RUN)

```sh
vp test run apps/server/src/orchestration-v2/FoundationProjection.test.ts apps/server/src/orchestration-v2/EffectWorker.test.ts apps/server/src/persistence/ForkMigrations.test.ts apps/server/src/persistence/Migrations.test.ts apps/server/src/persistence/ForkMigrations/044_ProjectionThreadAttentionAudit.test.ts apps/server/src/persistence/ForkMigrations/045_TwsBindings.test.ts apps/server/src/persistence/Layers/ProjectionThreadAttentionAudit.test.ts apps/server/src/persistence/Layers/TwsBindings.test.ts
vp test run apps/server/src/tws/TwsBindingMatch.test.ts apps/server/src/tws/TwsCliAdapter.test.ts apps/server/src/tws/TwsCliDecoder.test.ts apps/server/src/tws/TwsContextService.test.ts apps/server/src/tws/TwsTopology.test.ts apps/server/src/serverRuntimeStartup.autoPull.test.ts apps/server/src/serverRuntimeStartup.test.ts apps/server/src/ws.test.ts
vp test run packages/client-runtime/src/attentionSync.test.ts packages/client-runtime/src/state/attention.test.ts packages/client-runtime/src/state/attentionNotifications.test.ts packages/client-runtime/src/state/commandPermissions.test.ts packages/contracts/src/attention.test.ts packages/contracts/src/attentionSync.test.ts packages/contracts/src/twsBindings.test.ts packages/contracts/src/twsContext.test.ts packages/contracts/src/workItem.test.ts
```

After integration: affected-package `vp run typecheck`, scoped format/lint, and one integrated web/desktop settings + multi-environment attention pass; mobile shared-state/type surface verification only, no push claim. Use repository commands in the integrated target, never repo-wide checks.

## Generated lifecycle metadata inspection

The final independent-root AND sequential combined Git-index replay proof is preserved at `../../attention-notifications/artifacts/v014-exact-replay-proof.json`. Both roots reproduce their landed `apps`/`packages`/`docs` trees exactly from genuine baselines, with recipe content/preimage checks. This is byte/replay evidence, not a runtime test or a platform waiver.

Inspected actual apply-session/manual-validation needs_review, actual-base status and failed verify hashes, staged-index record provenance, complete recipe/preimages, natural generation/dependency capture and canonical/audit patch equality. CLI record appends one generation and clears only the previous generation's moving canonical_patch alias; all previous generation payloads and audit patches remain. No hand-authored generation manifest. post-apply-diff.txt and record.md Change Summary are the installed apply-done unstaged-only summary (metadata, not product); they are preserved, NOT represented as complete source capture. The authoritative post-apply.patch, staged-index file count and exact byte proof are complete.

- `.tpatch/features/phase1-foundation/artifacts/apply-recipe.json` — landed SHA-256 `4faef0270a0d1158331829689f018dafd9fc9416653ec5e809f3359e27839d0e`.
- `.tpatch/features/phase1-foundation/artifacts/apply-session.json` — landed SHA-256 `516e20844a58978407237ee03385b45efc3a6e1b3e70d7975f047e3b0d1b47d6`.
- `.tpatch/features/phase1-foundation/artifacts/manual-validation.md` — landed SHA-256 `c24f4792048ecc66ca94765b5de47e70d107bfcccac5f7da77e83b8d697167d6`.
- `.tpatch/features/phase1-foundation/artifacts/patch-generations.json` — landed SHA-256 `f58ea84137bcc53e102355d1fe5d355ca426ed5f4f1ab1d107db8717cf54265e`.
- `.tpatch/features/phase1-foundation/artifacts/post-apply-diff.txt` — landed SHA-256 `b06c5c29a13b356d6f1631e1c9fec6cee66a58ffcc558080d8b263f57b1dbff4`.
- `.tpatch/features/phase1-foundation/artifacts/post-apply.patch` — landed SHA-256 `0ff017d936d51ba53c48b2c91eb8d250ee47c932c4d194c71fccb0733b6f043c`.
- `.tpatch/features/phase1-foundation/artifacts/v014-recipe-provenance.json` — landed SHA-256 `9a267271921e226bc5304c5589aaff46189989c9100843931420d488d73bd87b`.
- `.tpatch/features/phase1-foundation/artifacts/v014-reconcile-refusal.txt` — landed SHA-256 `28e71a82f71d3b8e8fb3a3c3314f361e74f4e5d157315433eb56dae61a2ce064`.
- `.tpatch/features/phase1-foundation/patches/026-record.patch` — landed SHA-256 `0ff017d936d51ba53c48b2c91eb8d250ee47c932c4d194c71fccb0733b6f043c`.
- `.tpatch/features/phase1-foundation/record.md` — landed SHA-256 `9cc9743af4a2ce9f6abfee47bab96255ea3cbb42669001d84eed0cb9f0cd837c`.
- `.tpatch/features/phase1-foundation/status.json` — landed SHA-256 `b9dcfda0318631ba159eafcf49c8ebbf61833c819ec662a1efcb92f92b7000c3`.
