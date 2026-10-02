# Manual Validation

**Status**: passed
**Timestamp**: 2026-09-23T04:28:08Z

## Notes

Focused regressions and targeted package typechecks pass. macOS arm64 standalone executable builds and runs help/version. Real bundled Copilot reports 1.0.75/protocol 3 in disposable state with zero inference. Full packaged-platform, SDK/native-CLI continuity and integrated-client gates remain pending.

## Issue #20 maintenance fixup (2026-10-02)

- The new multi-iteration regression failed against the old completion mapping.
  All 20 focused adapter cases pass with root session.idle completion, including
  repeated/child/foreground idle, full-turn attribution and usage, overlapping
  send refusal, approval/input, resumed sessions, native abort/error, interruption
  and late task updates. Five selected ingestion/attention/checkpoint cases pass.
  Scoped server typecheck and adapter lint pass.
- Real isolated web turns on actual CLI 1.0.75 / SDK 1.0.8 used only GPT-6 Astra
  and GPT-5.6 Sol. Both retain Working and Stop generation through subsequent
  tool/model iterations, emit exactly one completion at native session.idle,
  and display the full request duration. Final evidence includes completed
  attention state and one ready checkpoint for each model.
- The first concurrent Sol run also passed the lifecycle assertions but lacked
  a checkpoint after a Git/VCS detection warning. That run is retained
  separately; a sequential Sol replay produced its ready checkpoint. No product
  change was made for the replay, and the warning's cause is not claimed resolved.
- Complete canonical intent remains 38 files at original base
  8366d1db3119e8f5260d0a89584c49e5b4cbe53f; only adapter, its tests and provider
  user guidance change. Canonical patch round-trip and recipe replay pass.
  The original legacy recipe shape is retained with three updated postimages.
  A broader preimage upgrade was not adopted: this tpatch version's manual
  recording path did not create the provenance sidecar required by that upgrade.
  No provenance or generation records were fabricated.
- Web/desktop/mobile consume the existing canonical lifecycle, so no client
  protocol, renderer, notification coordinator or provider-specific UI changes
  are needed. Other provider adapters and local/remote transport ownership are
  unchanged. This is not a new Windows/mobile/native-package qualification.
- The first in-place landing made dependent historical replay anchors stale.
  A descendant replay also produced ambiguous historical landing candidates.
  Both attempts remain on separate local branches. A clean first-landing replay
  on `fix/copilot-turn-lifecycle` preserves all six complete maintained roots;
  their integrity checks pass and the final product tree is byte-identical to
  the tested integration at 42d6f112bb9438e4a9b63ffb79e44fdd8d858461.
  The provider's replay base is now a metadata seed with the original stable
  product bytes, not a new upstream release. Foundation's duplicated lockfile
  pin hunk is supplied by packaging in the explicit replay order; no product
  pins, dependencies or runtime bytes were changed by that reanchoring.
