# Feature Request: Copilot effective context and compaction controls

**Slug**: `copilot-context-window-controls`
**Created**: 2026-10-02T05:50:57Z

## Status and baseline

Requested only, on `feature/copilot-observability`, based on
`982929e9323f00ded5c7ca943f22a0bcef669a6f`. Hard parent:
`copilot-cli-provider`. Research is approved; product implementation and
lifecycle advancement are not. Issue #21 owns the evidence and open
decisions. Related inventory: #16; canonical backlog: #1.

## Problem and verified premise

Expose the effective native context tier and truthful usage denominator, rather
than implying that the model catalog's largest window is the current session
budget. Keep tier selection separate from automatic compaction thresholds and
manual compaction.

With SDK 1.0.8 and actual CLI 1.0.75, isolated T3 sessions reported
`session.usage_info.tokenLimit = 272000` for both `gpt-6-astra` and
`gpt-5.6-sol`. The adapter currently omits `contextTier` and `infiniteSessions`.
The context meter uses native currentTokens/tokenLimit, not a hardcoded 272k
denominator.

Small direct SDK probes observed:

| Model/configuration | Effective tier | Native tokenLimit |
|---|---|---|
| Astra, tier omitted | No tier reported | 272000 |
| Astra, native config long_context but SDK tier omitted | No tier reported | 272000 |
| Astra, explicit SDK long_context | long_context | 1050000 |
| Sol, explicit SDK long_context | long_context | 922000 |

Explicit SDK default was also reflected by `model.getCurrent()`. A journaled
Astra long_context session retained that tier when resumed without an explicit
tier. These are version-scoped observations, not universal config precedence.
The Sol catalog reports a 1050000-token maximum window but a 922000-token
maximum prompt budget; do not replace the observed denominator with the former.

## Existing native controls and T3 gaps

CLI help exposes `--context default|long_context`, persisted `contextTier`,
and an eligible-model context picker under `/model`. SDK create/resume exposes
contextTier; generated RPCs include model/options updates and current-model
inspection.

SDK `InfiniteSessionConfig` documents enabled-by-default automatic compaction,
backgroundCompactionThreshold default 0.80 and bufferExhaustionThreshold
default 0.95. These are utilization fractions, not a confirmed arbitrary
300k/1M CLI setting. No threshold-crossing workload was run. Effective prompt
budget, output reserve, actual trigger and account/model constraints must stay
distinct.

T3 currently advertises reasoning options, not context tiers/threshold controls.
It forwards used/max tokens and automatic-compaction capability but not an
exact trigger. SDK `history.compact` exists, but the Copilot provider does not
advertise a compact slash command or wire that API; the generic meter's compact
button is therefore not proof of Copilot support.

## Requested outcome and decisions before implementation

- Decide a small explicit supported tier control with native default/inherit
  semantics, runtime capability checks, create/resume/model-switch consistency,
  and clear model/account/pricing implications.
- Show effective tier/budget and provenance where useful; do not claim a maximum
  catalog capacity is usable or an estimated threshold is observed.
- Evaluate manual compaction and threshold controls independently. Prefer
  native APIs; preserve safe defaults and surface unsupported requests/errors.
- Keep web/desktop/mobile entry points and remote environments consistent.
  Context is session/provider state, not a global client-only denominator.
- Avoid large artificial token consumption merely to demonstrate a tier,
  blanket provider upgrades or silent global native-config mutation.

## Legacy meter origin

The opt-in/Legacy placement is upstream, not a fork decision:
`a19f01fc19d209d9962c4bb66372ed9e03e320a9`,
[pingdotgg/t3code#9190](https://github.com/pingdotgg/t3code/pull/9190),
"feat(web): make context window indicator opt-in". It defaults the display off.
No confirmed maintainer rationale or replacement commitment was found in the
retrieved discussion. A commenter's automatic-compaction theory is not a
maintainer explanation. Hiding the meter does not change runtime compaction.
