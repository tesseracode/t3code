# Validation

The new persisted orchestration scenarios failed before the source fix: cumulative
billing triggered replacement and discarded valid occupancy; unsupported
replacement paths completed by creating a different native conversation.

- Three focused persisted runtime scenarios pass after the fix:
  - Native occupancy 120615/200000, stored cumulative usage 1169410, additional
    cross-provider history: continuation completes on the same native identity,
    no extra generation, original occupancy and billing counters retained.
  - Genuine handoff budget exhaustion with replacement disabled: original budget
    message remains visible, user input/attachments retained, no new native ID.
  - Native resume failure with replacement disabled: failure remains visible,
    original native identity retained and no second prompt sent.
- 96 focused adapter/handoff/budget tests pass.
- `vp run check:changed f03693d6a4`: format, lint, GraphQL, 24 affected-package
  typechecks and 113 adjacent tests pass. Knip pass 1 retains the unchanged
  server SDK dependency warning; pass 2 passes.
- `tpatch record`: canonical patch round-trips cleanly.
- `tpatch verify`: historical provider-parent replay blocks child verification.
  No historical metadata was rewritten.

The runtime transcript above is an isolated persisted orchestration fixture, not
a reproduction of the private long conversation. No live state was modified.
