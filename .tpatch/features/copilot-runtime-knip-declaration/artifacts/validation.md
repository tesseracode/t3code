# Validation

- Before the configuration change,
  `vp exec knip --workspace apps/server --include dependencies --no-config-hints`
  failed on the SDK declaration. The identical command passes afterward.
- Existing source-server SDK resolution, external closure, and native payload
  tests pass: 41 tests across three files recorded by `tpatch test`.
- `vp run check:changed 60c107e3b3` passes formatting, both Knip passes, and
  affected-package typechecking. Configuration changes fan out to 37 packages;
  no separate repository-wide suite or build was run.
- No dependencies, packaging source, lockfile, or runtime configuration changed.
- `tpatch verify copilot-runtime-knip-declaration` passes all blocking checks,
  including recipe replay and canonical-patch replay.
