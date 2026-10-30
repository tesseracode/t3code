# Feature Request: Support and qualify Copilot Fusion model selection and effort tiers through the native Copilot SDK.

**Slug**: `copilot-fusion-model-selection`
**Created**: 2026-10-30T18:38:28Z

## Description

Support and qualify Copilot Fusion model selection and effort tiers through the native Copilot SDK.

## Verified starting point

Read-only inspection on October 30, 2026:

- GitHub documents Copilot Fusion as a model-routing/orchestration choice, not
  one fixed model. It can select single-model, cascade or critique execution.
  The documented selectable tiers are Standard, High and Max.
- The CLI guide documents the `fusion` alias and `--fusion-tier`, but public
  reports against CLI 1.0.105 describe flag, account and tier-name mismatches.
  Documentation alone does not establish a working SDK contract or minimum
  version. Do not copy undocumented feature-flag workarounds into the fork.
- Our maintained candidate pins SDK 1.0.8 and bundled CLI 1.0.75.
  `packages/provider-copilot/src/server/status.ts` dynamically maps SDK model
  IDs/names and exposes `reasoningEffort`; `adapter.ts` passes the selected
  model and reasoning effort when creating/changing native sessions.
- Generic model passthrough might already display/select Fusion if the
  configured runtime advertises it. However, the inspected path has no
  Fusion-tier option/plumbing, and no end-to-end Fusion run was performed.
  Do not characterize all alias support as absent or full support as proven.

This is a requested feature only. Do not implement it, upgrade dependencies,
switch current sessions/models, enable experimental flags or change the
ongoing v0.1.4 migration artifacts as part of this request.

## Requested outcome

1. Establish the exact supported native SDK/CLI discovery and session contract
   for Fusion, its eligible account/policy tiers, and its relationship to Auto.
   Record the tested versions and real capability results before choosing an
   implementation or SDK upgrade.
2. Expose eligible Fusion selection and supported tiers through the shared
   model-selection flow used by web, desktop and mobile. Do not conflate Fusion
   tier with a model's reasoning effort or context tier, synthesize unsupported
   catalog entries, or silently change defaults.
3. Preserve the choice through create, resume, per-turn model changes and cold
   reconnect; allow switching back to explicit models. Keep native Copilot SDK
   integration, existing credentials and session continuity. ACP is not part
   of this request.
4. Preserve Working/run completion, tool approval receipts, user-input delivery,
   cancellation and final-response behavior across Fusion's internal phases.
   Intermediate drafts/reviews must not falsely finish a run or duplicate final
   messages. Report requested routing choice separately from any actual routed
   models or fallback that the supported API exposes.
5. Handle unavailable/disabled tiers and unsupported runtimes explicitly.
   Respect account/admin policy and disclose multi-model/multi-vendor routing;
   never claim a fixed underlying model or invent usage/cost attribution.

## Future qualification

Use focused model-discovery/selection and lifecycle regression tests plus
real client screenshots for selection/tier changes. Lifecycle/timing claims
also need actual event/receipt evidence, not screenshots alone. Gate any paid
Fusion turn and model/vendor policy assumptions on appropriate user approval.
If an SDK/CLI bump is necessary, requalify packaged Windows, WSL/Linux and macOS
dependency closure and native resume behavior; do not assume installed global
CLI behavior matches the bundled runtime.

Keep subscription-limit reporting and general context-tier controls separate
from this feature (existing backlog #26 and #21 respectively).

## Sources

- [Official Fusion concepts](https://docs.github.com/en/copilot/concepts/models/copilot-fusion)
- [Official CLI model selection](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/choose-a-model)
- [github/copilot-cli#5290: documented fusion-tier flag mismatch](https://github.com/github/copilot-cli/issues/5290)
- [github/copilot-cli#5298: Fusion alias/tier availability report](https://github.com/github/copilot-cli/issues/5298)
- Candidate source `16d428db823f17c18ec16a79e1ec12ae4ba795c1`:
  `packages/provider-copilot/src/server/status.ts:23-59,150-154`,
  `packages/provider-copilot/src/server/adapter.ts:1169-1175,1339-1344`,
  `pnpm-workspace.yaml:233-237`.

The GitHub issue reports are compatibility cautions, not independently
reproduced failures or established facts about every account/runtime.
