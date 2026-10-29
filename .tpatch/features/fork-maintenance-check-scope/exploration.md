# Exploration

`scripts/check-changed.ts` passes changed files to Vite+ formatting/linting and
uses `.github/scripts/ci-changes.cjs` for package impact. The classifier already
treats `.agents/`, `.repos/` and other administrative directories as inert.
Root `vite.config.ts` already excludes vendored/generated files from formatting
and linting.

Extend those existing mechanisms only for `.tpatch/`. Add a small Vitest case
table under `scripts/lib/` for metadata-only, mixed-source and lookalike paths;
there is no existing classifier test file. Do not edit archived records or add
a second checker, suppression of product errors, or a runtime abstraction.
