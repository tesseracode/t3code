# Chosen source

Use the exact reviewed product delta from `e6d01c63390dbba90f74557ef877f44a6893a375`
to `40b0822b7a2852d535f37c6bd510dbcf4e6dcc59`, excluding only administrative
`.tpatch` content. It contains the skill-control implementation and the legacy
restoration, including the independently identified race/custom-slug fixes.

This is a full maintained root, not an incremental fix that omits its earlier
implementation. It touches the provider package/core, contracts, registry,
authorization/instrumentation/WS wiring, shared client permission tests, and
the existing web composer/style and user guidance.

Existing failing-first receipts, focused tests and real isolated client
captures remain applicable only after an exact source/mode comparison proves
the restored product matches that reviewed source. Repeat affected checks on
the composed replacement before recording. Rebuild recipe contents explicitly
if they are retained after a source edit; do not assume a regeneration flag
updated them. No live state, profiles or installed applications are touched.
