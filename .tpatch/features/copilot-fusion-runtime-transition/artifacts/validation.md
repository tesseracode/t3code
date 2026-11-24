# Validation

- Before implementation, the focused `renews routing preferences` adapter case
  failed: expected `restart_session`, received `apply_on_next_turn`.
- `vp test run packages/provider-copilot/src/server/adapter.test.ts packages/provider-copilot/src/server/routing.test.ts apps/server/src/orchestration-v2/ProviderSwitchService.test.ts apps/server/src/orchestration-v2/SelectionRestart.integration.test.ts`:
  passed, 53 tests.
- `vp run check:changed c69222b542`: format, lint, both affected-package
  typechecking and tests passed; the first knip pass failed on the existing
  `apps/server` SDK dependency. That dependency is unchanged from the baseline
  and intentionally supports source-built runtime resolution. No dependency was
  removed to make this report green.
- Initial `tpatch verify copilot-fusion-runtime-transition`: blocked before
  feature replay because the historical `copilot-cli-provider` canonical patch
  is absent from its verification baseline. This is not a successful native
  replay verification.

## Isolated native transcript

SDK 1.0.28 / native runtime 1.0.105, fresh disposable profile; no repository
configuration, extensions or tools:

```text
flags off: global routing metadata absent; session routing metadata absent
flags on: global and session tiers include hydrafusion-max
concrete control: claude-haiku-5.5; one root user message
stop runtime; reopen with Fusion flags; resume original native session
Fusion Max: effective autoTier=hydrafusion-max; remembered fixture marker
native session identity unchanged; exactly two root user messages
fusion_resolved -> phase_started -> phase_completed -> fusion_completed
return to concrete: same native session; concrete model effective
```

Only the fixture conversation was used. Live installations, profiles and
conversations were not changed.
