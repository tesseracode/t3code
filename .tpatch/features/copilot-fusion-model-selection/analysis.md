# Analysis: copilot-fusion-model-selection

## Summary

Fusion selection plus trustworthy model/phase observability is feasible through
the native SDK, but is not a model-alias-only change on the deployed fork.
The installed SDK 1.0.8 has no typed Fusion route/phase contract. The latest
release observed during this investigation, SDK 1.0.28, does have that contract,
account-bound routing discovery, and transactional preference changes.

Recommendation: define the feature around account-advertised routing selection
and a bounded durable per-turn model/phase timeline, with an SDK/runtime
compatibility gate before implementation or rollout. Do not select a minimum
version from this comparison alone: 1.0.28 is a candidate with inspected public
source, not a tested compatible upgrade or proof of the first supported release.

The maintainer clarified the immediate goal: use Fusion for day-to-day tasks
next week as an experiment, and see which concrete models ran and when. A picker
without historical attribution would not meet that goal. This analysis does
not change current defaults or authorize spending on a test turn.

## Method and evidence boundary

Path B: agent-authored analysis, followed by
`tpatch analyze copilot-fusion-model-selection --manual`. No configured LLM
provider is invoked. Stop at analyzed; no define/implement/apply/record phase
is implied.

Read-only evidence:

- Feature branch starts at `a043de31d500054e1be2d1907c09e088ad0b74de`.
  The inspected provider server files and model-selection contract have no
  diff from deployed runtime source `16d428db823f17c18ec16a79e1ec12ae4ba795c1`.
- Installed SDK 1.0.8 declarations and implementation were read from the
  existing build dependencies, without installation or modification.
- The Intel release's existing platform launcher was invoked only with
  version/help flags. No SDK client/session, model listing, inference, login,
  experimental feature flag, or provider setting was started/changed.
- Official Fusion documentation, public CLI issues, npm metadata, and SDK
  release source were read. SDK v1.0.28 is pinned here to commit
  `fa108e71ee3025663e0dac20f2a071055d3a6b14`, not moving main.

This establishes available API shapes, not account entitlement, real emitted
payloads, performance, or integration correctness. Authenticated account-specific
catalog discovery and actual Fusion execution remain unperformed.

## Compatibility

**Verdict: requires semantic adaptation and runtime qualification.**

| Surface | Installed fork / SDK 1.0.8 | SDK v1.0.28 public source |
| --- | --- | --- |
| Selection | Dynamic model IDs; reasoning effort only | Virtual `auto` model with account-advertised routing preferences |
| Tier discovery | Fork calls `client.listModels()` | RPC model lists include separate `auto` metadata with enabled/visible tier descriptors |
| Create/resume | Model and reasoning effort supplied | `SessionConfigBase.capi.autoTier`; cold-resume restoration documented |
| Live preference change | No fork plumbing | `setModel("auto", { autoTier })` or `setAutoTier()`; pending is not committed |
| Fusion routing | No typed Fusion events found | Explicit route-start/failure, resolved plan, completion |
| Concrete phase attribution | Ordinary usage includes model, but fork reduces it to token totals | Phase model/role/identity/duration and Fusion attribution on ordinary events |
| Runtime distribution | Resolver expects `@github/copilot-<platform>-<arch>` | SDK optional platform packages named `@github/copilot-sdk-<platform>` |

The existing generic selection options can likely carry a routing preference;
do not add a parallel configuration system before evaluating that mechanism.
However, a durable execution timeline is not represented by the existing
aggregate token counter. Its wire/projection representation needs explicit
definition rather than overloading the requested model string.

### Actual runtime version correction

The Intel platform directory is named for CLI 1.0.75. Its normal `--version`
reported 1.0.106-2; the same launcher with `--no-auto-update --version` reported
1.0.75. Installed SDK 1.0.8 `dist/client.js:1703-1706` starts subprocesses with
`--headless --no-auto-update`. Therefore the normal launcher result is not proof
that T3's SDK child uses 1.0.106-2. No live child version was queried here.

The effective launcher help exposed `--auto-tier <preference>` with exact
advertised IDs, but not `--fusion-tier`. Documentation shows the latter.
Public reports github/copilot-cli#5290 and github/copilot-cli#5298 describe
similar mismatches. Do not translate documentation labels into wire IDs or
enable undocumented flags to force availability.

## Selection and discovery findings

In v1.0.28:

- `AutoTierDescriptor` carries opaque `id`, display label, description,
  extensible execution `type`, optional `fusionTier`, and status. Status includes
  `enabled`, optional `pickerVisible`, and reason/message.
- `ModelList.auto` and `SessionModelList.auto` carry account-bound tier metadata.
  `client.listModels()` still returns only `response.models`, discarding the
  sibling metadata. Merely upgrading and keeping the current discovery call
  would miss it. Evaluate supported `client.rpc.models.list` / session model
  discovery and validate their returned metadata at the adapter boundary.
- `capi.autoTier` configures routing for model `auto`. The documented SDK live
  call is `setModel("auto", { autoTier: <advertised-id> })`. The RPC rejects
  that option beside a non-`auto` model. A CLI `fusion` alias is not a substitute
  for establishing the SDK mapping.
- `setAutoTier()` stages a preference; an acknowledgement can be pending.
  `getCurrent()` exposes effective, pending, and activating states. Success is
  observed through `session.model_change`; failure through the transient
  `session.auto_tier_switch_failed`. Do not show the requested tier as applied
  merely because a setter resolved.
- Preference IDs are extensible strings. Human labels Standard/High/Max are
  presentation, not an exhaustive wire enum. Do not infer a mapping from
  `efficiency`, `balance`, or `intelligence`, or expose integrator-only presets.

Use the destination environment's provider instance/account catalog; do not
reuse eligibility from another machine or account. Respect hidden/disabled
choices and return-to-explicit-model behavior. Preserve context tier and
reasoning effort as separate concepts.

## What can answer "which model, and when?"

These are source-defined v1.0.28 capabilities, not live observations:

| Event | Information relevant to the experiment | Native durability |
| --- | --- | --- |
| `session.fusion_route_started` | Routing attempt, policy, selected synthetic model, event time | Transient |
| `session.fusion_resolved` | Fusion/turn IDs, pattern, primary/secondary/judge/repair/critic plan, fallback, routing latency, policy/version metadata | Documented durable |
| `session.fusion_route_failed` | Routing attempt, reason, deterministic fallback model, optional Fusion ID and routing latency | Documented durable |
| `assistant.fusion_phase_started` | Concrete model, role, phase/Fusion IDs, scope, pattern, optional effort, event time | Transient |
| `assistant.fusion_phase_activity` | Content-safe progress, phase identity, activity kind | Transient |
| `assistant.fusion_phase_completed` | Concrete model, phase identity/role, duration, status, usage, verdict | Documented durable |
| `assistant.fusion_phase_failed` | Concrete attempted model, phase identity, duration, reason, degradation target | Documented durable |
| `session.fusion_completed` | Final-source model/phase, commit ID, outcome, degraded reason, total duration, request count and usage | Documented durable |
| `assistant.usage` with `fusion` attribution | Per-call model, duration/TTFT where emitted, Fusion/phase/role/commit attribution | Check event flag and runtime behavior; do not assume archival completeness |

Planned models are not proof those models ran. Conditional repair can be
skipped; critics can run in parallel, including separate phases using the same
model. Final-source model is distinct from every model consulted. Preserve
phase identity rather than collapsing a turn to one model or deduplicating by
model name.

For the first experiment-ready slice, retain requested routing choice,
confirmed effective preference, resolved pattern, observed phase model/role,
start/end observation, provider duration, fallback/failure, final source and
completeness. Keep source event IDs/time and environment/provider/native
session/turn/Fusion/phase identity sufficient for idempotent reconstruction.
Do not treat event `parentId` as a phase-parent or model-call identifier: its
contract is chronological linkage. Do not invent a call join where no stable
identifier exists.

Use source timestamps for chronology and label receipt time separately. Parallel
phases are overlapping intervals, not a serial sum. A completion timestamp minus
duration can provide an explicitly derived start estimate, not the exact
missing selection/start event. Reconnect cannot recover transient start/progress
events from native durable history alone. Persist a bounded normalized subset
locally as events arrive; reconstruct durable facts on replay and mark gaps.
Do not promise exact per-request start times or complete routing history from
phase summaries alone.

## Current adapter gaps and lifecycle risks

`status.ts:23-59,150-154` maps model IDs/names and supported reasoning efforts.
`adapter.ts:1169-1178,1339-1345` supplies model/effort on create and change.
There is no Fusion preference translation or confirmation.

`adapter.ts:928-960` sums `assistant.usage` input/output/cache counts and keeps
the timestamp, but discards the concrete model, call duration and routing
attribution. Unsupported event cases return without normalization. Existing
`session.auto_mode_resolved` describes an older first-prompt Auto intent
decision; it must not be presented as complete Fusion phase history.

Root `session.idle` is the established successful run-completion boundary.
Do not replace it with a phase completion, assistant iteration end, or even
Fusion aggregate completion: the newer completion shape explicitly permits
`awaitingBackgroundWork`. Preserve actual permission-success receipts and
user-input delivery rather than inferring them from progress events.

New phase-completion events also contain textual output and internal projection
messages/staged terminals. They are NOT automatically user-visible assistant
messages or tool-approval authority. Normalize metadata only for the timeline;
do not leak drafts, judge text, internal history, tool arguments, or chain of
thought into the ordinary transcript. Use authoritative final commit/source
attribution to avoid duplicate final responses.

Choose one accounting source for totals. Do not add phase aggregates, Fusion
aggregates and ordinary per-call usage together. Quota reporting remains #26;
this feature only needs honest attribution and reported duration/usage where
available, without invented prices or vendor claims.

## Upgrade and distribution implications

SDK v1.0.28 npm metadata declares native optional platform packages
`@github/copilot-sdk-{darwin,win32,linux,linuxmusl}-{x64,arm64}`, plus `koffi`.
Its source runtime resolver uses a `copilot-runtime` wrapper and `runtime.node`.
This differs from the fork's current explicit platform-package resolution and
packaging closure. Its npm `copilotCliVersion` is 1.0.105; release notes mention
snapshot 1.0.105-1. Neither value establishes a working minimum for each account.

A version-only bump is insufficient. Verify runtime resolution, native assets,
executable modes, archive staging, Windows/WSL payload pruning and subprocess
isolation on supported targets. Keep native SDK/CLI session ownership and
credentials; ACP or an in-process-runtime migration is not required by this
request. Read the actual runtime startup result before claiming compatibility.

The source-server missing-SDK-resolution bug is tracked separately in #34.
Its user-confirmed deployment symlink is not a durable fix. Treat correct
source-built dependency closure and provider readiness as a prerequisite to
that target's Fusion qualification, not an unrelated fix silently folded into
this feature. Preserve the existing hard parent `copilot-cli-provider`; do not
add speculative DAG dependencies before a repair feature exists.

## Surfaces, policy, and experiment readiness

- Server/provider: discover account-bound routing capability, map config and
  confirmations, normalize events, and preserve session/run semantics.
- Contracts/projections: define durable bounded execution metadata and gap
  semantics, reusing existing turn-item/event infrastructure where lossless.
- Web/desktop and mobile: expose eligible routing options through shared model
  selection, plus the same readable history/timing detail. Do not make an
  experiment depend on hovering a desktop-only label.
- Remote/relay/multi-device: environment remains authority. No browser polling
  of provider processes, new cross-machine orchestrator, or raw native-event
  stream over WebSockets. Avoid repaint timers/high-frequency progress writes.
- Other providers: no Fusion routing changes. Generalized fields should remain
  optional and preserve older/non-Copilot histories.

Official policy documentation says Fusion considers subscription, admin,
data-residency and evaluation-model policy. It can select multiple vendors;
display names and a prompt instruction do not enforce a vendor allowlist.
The maintainer's Fusion-only experiment goal is recorded, but no organizational
policy was inspected/changed and no specific exception to the existing
OpenAI/MAI-only execution preference was established here. Resolve that before
paid trials if a reliable allowlist is unavailable; do not block source analysis.

Before calling the next-week experiment ready, establish actual account catalog
availability, an exact SDK/runtime pair, selection confirmation, durable model
timeline after cold reconnect, and truthful failure/gap reporting. Include
single/cascade/critique behavior where available, parallel/repeated-model
critics, fallback, cancelled/failed phases, background work, ordinary approvals
and input, and switching back. Deterministic fixtures cover translation/order/
deduplication without paid calls; a separately approved bounded real Fusion run
must establish actual runtime payloads. Missing patterns are unqualified, not
passes. Visual evidence/review is needed for implemented client behavior.

## Decision and next lifecycle step

The registered prerequisite is now `copilot-sdk-runtime-upgrade` (hard), itself
dependent on `copilot-cli-provider`. Its analysis compares upgrade and Fusion
scope: qualify runtime compatibility first, then implement this experiment-facing
feature. Fusion definition can proceed alongside that qualification, but a
picker alone on the existing runtime does not meet the experiment's goal.

Proceed to definition, not directly to implementation. Define the smallest
experiment-ready selection + observation slice and its runtime compatibility
gate. The richer v1.0.28 contract materially improves feasibility over the
installed SDK, but account support, effective runtime pair, upgrade compatibility
and exact observed timing remain qualification work.

No product changes, dependency installs, live turns, account changes, service
restarts, model-default changes, or platform success claims are part of this
analysis.

## Sources

- Fork source (matching deployed provider files):
  `packages/provider-copilot/src/server/{client,status,adapter}.ts`;
  `packages/provider-copilot/package.json`;
  `packages/contracts/src/modelSelection.ts:9-19`.
- Installed SDK 1.0.8:
  `dist/types.d.ts:1542-1570`;
  `dist/generated/session-events.d.ts:1305-1368,3725-3810,7755-7820`;
  `dist/client.js:1703-1706`.
- [Official Fusion concepts and policy](https://docs.github.com/en/copilot/concepts/models/copilot-fusion).
- [Official CLI model selection](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/choose-a-model).
- [SDK v1.0.28 release](https://github.com/github/copilot-sdk/releases/tag/v1.0.28);
  [npm package metadata](https://registry.npmjs.org/@github/copilot-sdk/1.0.28).
- Pinned v1.0.28 source:
  [routing config](https://github.com/github/copilot-sdk/blob/fa108e71ee3025663e0dac20f2a071055d3a6b14/nodejs/src/types.ts#L2394-L2409),
  [selection setters](https://github.com/github/copilot-sdk/blob/fa108e71ee3025663e0dac20f2a071055d3a6b14/nodejs/src/session.ts#L2790-L2863),
  [catalog metadata](https://github.com/github/copilot-sdk/blob/fa108e71ee3025663e0dac20f2a071055d3a6b14/nodejs/src/generated/rpc.ts#L9281-L9355),
  [routing and aggregate events](https://github.com/github/copilot-sdk/blob/fa108e71ee3025663e0dac20f2a071055d3a6b14/nodejs/src/generated/session-events.ts#L4949-L5401),
  [phase events](https://github.com/github/copilot-sdk/blob/fa108e71ee3025663e0dac20f2a071055d3a6b14/nodejs/src/generated/session-events.ts#L6065-L6405),
  [Fusion attribution](https://github.com/github/copilot-sdk/blob/fa108e71ee3025663e0dac20f2a071055d3a6b14/nodejs/src/generated/session-events.ts#L6897-L6954),
  [model-list convenience method](https://github.com/github/copilot-sdk/blob/fa108e71ee3025663e0dac20f2a071055d3a6b14/nodejs/src/client.ts#L2692-L2720),
  [runtime artifacts](https://github.com/github/copilot-sdk/blob/fa108e71ee3025663e0dac20f2a071055d3a6b14/nodejs/src/runtimeArtifacts.ts#L240-L290).
- Compatibility cautions, still open when read:
  github/copilot-cli#5290 and github/copilot-cli#5298. These are reports, not
  reproduced account failures or instructions to enable undocumented flags.
