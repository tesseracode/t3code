# Exploration: copilot-fusion-model-selection

## Result and boundary

The smallest credible slice uses existing shared model options and V2 persisted
turn items; it does not need an orchestrator, a second connection registry or a
raw SDK-event WebSocket channel.

Implementation authorization on November 2 permits offline development after
Mac arm64 native fixture qualification, while other packaged targets and real
account/Fusion execution remain unqualified rollout gates. Use optional typed
modelExecution metadata on existing system_notice items, with a readable fallback
message: old clients can still decode and display the notice, without a new
discriminated-union tag or JSON encoded into transcript text. The final recorded
patch and regenerated recipe cover all manual-session edits.

The sibling SDK upgrade is being applied in the isolated worktree. Its native
no-auth handshake reports CLI 1.0.105 / protocol 3. This establishes transport
startup only, not account catalog access or actual Fusion execution. Do not
remove the hard prerequisite based on a handshake.

## Selection trace

`packages/provider-copilot/src/server/status.ts` currently calls
`client.listModels()` and `modelsFromSdk` exposes reasoning-effort descriptors.
The installed candidate's convenience method still drops sibling Auto metadata.
Use supported typed catalog RPC results for an account/instance, with descriptor
status and execution type validated at this boundary. Do not infer Fusion from
the name of any model entry.

`packages/contracts/src/modelSelection.ts:9-13` already carries instanceId,
model and optional `ProviderOptionSelections`. Reuse this wire choice rather
than add a separate `fusionModel` field or a second saved-provider setting.
Routing selection must remain distinct from runtime effective/pending state.

Web's `apps/web/src/modelSelection.ts` derives instance-scoped model options;
`components/chat/ProviderModelPicker.tsx` selects the model and the Traits path
(`TraitsPicker.tsx`, `composerProviderState.tsx`) consumes option descriptors.
Review both the ordinary composer and settings/scheduled-task entry points when
implementing, not just the visible dropdown.

Mobile's `apps/mobile/src/lib/modelOptions.ts` already consumes
`getProviderOptionDescriptors` and
`buildExplicitProviderOptionSelectionsFromDescriptors`; its
`components/ComposerModelControl.tsx` and thread settings/composer callers are the
separate presentation path. A shared descriptor does not automatically prove
pending/disabled-state presentation on either client.

In the adapter, create/resume config must carry `capi.autoTier`; per-turn changes
must preserve requested versus effective selection using the candidate's current
state/commit receipts. A successful promise is not a committed preference.
Never overwrite the user's requested router with a concrete phase model.

## Persistence trace and proposed minimal representation

`packages/provider-core/src/server/ProviderAdapter.ts:118-120` emits typed
`turn_item.updated`. `apps/server/src/orchestration-v2/ProviderEventIngestor.ts:
652-663` turns that into persisted `turn-item.updated`, and
`ProjectionStore.ts:878` upserts the projection by item ID.

`packages/contracts/src/orchestrationV2.ts:1452-1479` already provides thread,
run/node, provider thread/turn, native item reference, status and timestamps.
Its `system_notice` variant contains only a message and has no suitable typed
execution-history payload. Do not serialize untyped Fusion JSON into that
message or pretend phases are assistant/tool/approval messages.

Prefer a typed model-execution turn-item variant through this existing path,
with bounded metadata, stable Fusion/phase identity and explicit provenance/gap
fields. Decide exact summary/phase item granularity and limits in the implementation
recipe after checking event identity and existing history paging/limits. Keep
terminal facts independent of currently active-turn state so native replay and
late completions do not attach to the wrong run.

This needs exhaustive-consumer work, not only a new schema:

- Provider adapter normalization and snapshot/native-history import.
- V2 contract decoding, ingestion and projection/paging round-trip.
- Client-runtime timeline grouping/presentation and wire/history merge.
- Web `components/chat/MessagesTimeline.tsx`, `V2ItemInspector.tsx` and existing
  `WorkLog.tsx` display primitives.
- Mobile `features/threads/thread-work-log.tsx`, `thread-list-v2-items.tsx` and
  relevant feed grouping.

Check old-client protocol handling before release: an unknown discriminated
union item can fail decoding. Optional provider support does not make a new item
type compatible with an old installed phone. Do not claim a schema change is
additive until the client compatibility gate is established.

## Normalization rules that constrain implementation

Use the allowlisted route/phase/usage/final-source fields from analysis.md.
Route plans are planned; phase completions establish attempted/executed models.
Use phase identity even for repeated model names. Preserve overlap, failure and
fallback without interpreting private draft text.

Live starts are transient; persist normalized starts when observed. Native
completion replay may yield only a derived start estimate, never an exact
recovered start. Source event timestamps and local receipt times are different.
Bound phase/event summaries and represent truncation/gaps explicitly; do not
drop terminal facts silently. Activity ticks do not require durable writes.

One usage provenance wins for aggregates. No sum of per-call plus per-phase plus
per-Fusion totals. Do not finalize the T3 run on internal phase or aggregate
completion; root idle and existing request receipts remain authoritative.

## Focused proof locations

- Provider `status.test.ts` and `adapter.test.ts`: catalog eligibility, selection
  commit/failure and event translation/lifecycle.
- `packages/contracts/src/orchestrationV2.test.ts`: new item decoding and older
  histories without the field.
- Existing V2 ingestor/projection/paging tests: round-trip and idempotent native
  replay with gaps/reordering, without duplicate mirrored coverage.
- Shared model option tests and the client-runtime history layer for the
  shared behavior. Web/mobile tests only for distinct presentation behavior.
- Permission-approved real-client inspection after integration, and separately
  approved account/Fusion turns for actual runtime attribution.

No client or product-code changes are made by this exploration. Native account
eligibility, vendor-policy compatibility, real Fusion event completeness, model
switch confirmation timing and old-client protocol compatibility remain gates.
The next lifecycle step can prepare the recipe, but the SDK/platform qualification
and those unresolved evidence gates must not be relabeled as passed.

## Integrated offline implementation and replay boundary

The implementation landed with unchanged hard provider and SDK dependencies.
Focused deterministic coverage and scoped types pass; no authenticated account,
vendor inference, browser or device was used.

Native Fusion verification exposes a further tpatch limitation: its topological
closure checks every landed ancestor's canonical postimage at the same post-SDK
anchor. SDK changes intentionally replace parts of the provider's old postimage,
so verification refuses before testing the Fusion recipe. Removing the direct
provider edge would not fix this: the SDK's transitive hard closure includes it.
No dependency was weakened and no landing or generation was rewritten.

An isolated-index reverse/forward composition proves provider, packaging replay,
SDK and Fusion canonical patches reconstruct the exact source landing. All 32
Fusion recipe contents match that boundary. Historical parent whole-file recipes
are snapshot-specific and are not safe substitutes for canonical patch composition
on the reconstructed baseline; the provider manifest recipe would remove unrelated
later exports. The generated Fusion recipe also retains the tool's legacy unhashed
write operations. `artifacts/replay-proof.json` records these limits and hashes.
This is explicit manual evidence, not a native verification pass or rollout approval.
