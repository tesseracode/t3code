# Analysis

The receiving Windows machines already have the fork preview installed. The
build-only workflow currently emits only an NSIS installer with the same app
identity, so a fresh data home alone cannot make installation side by side.

The desktop builder already accepts a ZIP target and validates the complete
`win-unpacked` payload before artifact collection. The preview manifest already
hashes ZIP files. Only workflow selection and upload coverage are missing.

Add a constrained dispatch choice, preserving NSIS as the default. Do not
change the desktop identity, installer, runtime, signing, update behavior,
application source, profile handling, or upstream build workflow.

This depends on `copilot-runtime-packaging`, which owns the isolated preview
workflow and its packaging/provenance checks. A ZIP is a validation delivery
mechanism, not proof that existing data or managed WSL is isolated.
