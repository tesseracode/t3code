# Validation

The regression failed before implementation: explicit provider default never
reached the required native reset. The completed routing matrix covers omitted,
default and three opaque IDs; rejection covers unavailable/hidden/disabled,
malformed and concrete-model preferences, missing metadata and failed discovery.
Reset failure releases the owned session without inference.

- `vp test run packages/provider-copilot/src/server/textGeneration.test.ts packages/provider-copilot/src/server/routing.test.ts`: 9 passed.
- `vp run check:changed 0c0303b8f4`: format, lint, both focused tests and
  affected-package typechecks passed. Knip pass 1 retains the baseline
  `apps/server` SDK dependency warning; pass 2 passed. The dependency is unchanged.
- Native SDK 1.0.28 / runtime 1.0.105, fresh isolated profile: actual shared
  `generateThreadTitle` returned valid structured text with requested and effective
  `hydrafusion-max`. Native route, phase and completion events were observed;
  tool count was zero and config discovery false. Owned runtime/profile cleaned.
- `tpatch record`: canonical patch round-tripped against the working tree.
- `tpatch verify`: historical `copilot-cli-provider` parent reconstruction
  failed before child replay. This does not constitute passing native verification.

No live profile, installed app or original paused prototype was modified.
The separate missing-title report is not claimed reproduced or fixed.
