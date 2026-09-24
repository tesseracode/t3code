# Exploration: copilot-runtime-packaging

## Bounded source ownership

The actual committed delta from `acd69601918506de8a86754cb2aee73cc7afb085`
through `692b356e54ca8fc9c39641733ef417bc3e683202` is:

- `apps/desktop/src/wsl/DesktopWslEnvironment.ts`
- `apps/desktop/src/wsl/DesktopWslEnvironment.test.ts`
- `docs/operations/release.md`
- `packages/shared/package.json`
- `packages/shared/src/copilotRuntime.ts`
- `packages/shared/src/copilotRuntime.test.ts`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `scripts/build-cli-archive.ts`
- `scripts/build-desktop-artifact.ts`
- `scripts/build-desktop-artifact.test.ts`
- `scripts/lib/copilot-payload.ts`
- `scripts/lib/copilot-payload.test.ts`

This range excludes the earlier provider, session search, notice and
foundation implementations. The source baseline already contains them.
The combined record therefore does not replace those maintained roots.

## Verification constraint

tpatch v0.16.0's landed verifier uses historical replay plus an isolated
current-HEAD reverse-apply check. Later-touch attribution is advisory, not
authority to accept changed postimages. If reverse application needs all
context discarded, it refuses rather than silently certifying another copy
of the same text. v0.17.0 release notes do not promise changed current-anchor
or stack-composition semantics.

The closure child extracts the pruning root's package resolver to reuse it,
extends its original new-file helper/tests, adds required override inputs and
changes the packaging import adjacent to WSL validation. These are intentional
integrated changes, not removed pruning/readiness behavior. Consolidation
matches the real maintenance boundary without duplicating resolution or
changing code simply to satisfy old text anchors.

## Supported adoption

Use manual analyze, define, explore and implement in order. The hand-authored
recipe is a complete deterministic projection of actual committed source with
explicit baseline SHA-256 preimages. Apply completion records adoption, not
re-execution over already materialized code. Record with explicit committed
range and path scope, regenerate the canonical recipe, and land with trailers.

Add supersession only after the replacement's integrity passes. Keep existing
historical dependency relationships and append resolution reviews rather than
editing unsuccessful old verification evidence. Validate default next/replay
dispositions for all four historical records.
