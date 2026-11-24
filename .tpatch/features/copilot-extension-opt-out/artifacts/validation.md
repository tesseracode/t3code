# Validation

Both creation/resume regressions fail before the one-line fix on the independently
observed missing-extension-host error. Afterward the adapter accepts exactly one
fixture prompt and settles normally with skills/discovery settings unchanged.

- `vp test run packages/provider-copilot/src/server/adapter.test.ts packages/provider-copilot/src/server/textGeneration.test.ts`: 41 passed.
- `vp run check:changed 6b43f8280c`: format/lint, 10 affected-package typechecks
  and 36 adjacent adapter tests pass. The unchanged server SDK knip warning
  remains in pass 1; pass 2 passes.
- SDK 1.0.28 / runtime 1.0.105, fresh isolated native profile: explicit extension
  request reproduces the exact missing-host failure before any prompt. Explicit
  opt-out cold-resumes the same persisted conversation and returns its fixture
  marker. Owned runtimes/profile are cleaned afterward.
- The new native experimental-toggle sequence with omitted request succeeded
  this time. The earlier affected-profile failure is not unconditional and its
  persistence mechanism is not claimed localized by this fix.
- `tpatch record` round-trips the patch; `tpatch verify` remains blocked by
  historical provider-parent replay before checking this child.

No live profile/global CLI settings were changed. This does not claim a new
packaged Windows/Linux validation or a generic No project failure.
