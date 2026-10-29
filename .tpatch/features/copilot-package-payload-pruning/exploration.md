# Exploration: Copilot payload pruning on v0.0.42

The old canonical patch is intent evidence only. Current upstream no longer
builds a shared Windows/Linux server node_modules tree.

## Wiring

- `scripts/lib/copilot-payload.ts` owns reviewed payload layouts and the
  validate-then-prune operation.
- `stageWindowsServerSidecar` calls it after installing Windows externals and
  before packing the sidecar.
- The desktop app stage calls it after installing native externals; Windows
  main-process stages without the SDK are intentionally unchanged.
- `stageRuntimeExternals` in `build-cli-archive.ts` calls it before archive
  cleanup/packing. These Linux archive bytes are copied unchanged into Windows
  releases for WSL.

Resolve package roots from their owners and canonicalize them inside the stage.
Strict pnpm package-root links are supported when their real paths stay inside
the stage; unexpected links inside payloads are rejected. Do not prune a global
or source package store found through fallback resolution.

The package files were inspected for exact CLI/platform 1.0.75 and Koffi 3.3.1.
Generic clipboard loader code falls back to the preserved specialized binding.
Architecture-specific exceptions matter: Linux arm64 lacks the recorder native,
macOS x64 lacks Foundry, and some packages bundle a second CPU's search binaries.
Do not infer a universal removal count from the old Windows/WSL fixture.

## Evidence boundaries

Fixtures cover all reviewed targets and failure-before-mutation behavior.
Real isolated macOS hoisted and strict-linker stages prove pruning works on
actual packages. Retained native hashes, clipboard loading and a headless
start/status/stop handshake use no inference or user state. Real Windows files
are packed with the production ASAR helper on macOS, which proves membership,
not Windows execution or the complete installer budget.

The first ASAR probe placed its source beneath a hidden ancestor; the existing
unpack glob did not match there. The production-style system temporary stage
was used for the corrected proof; this root does not change unrelated ASAR
glob behavior.

Tpatch's initial dependency-expanded reconciliation visited already-landed
parents and misidentified them as upstreamed via reverse application to the
integrated worktree. Only metadata produced by that invocation for those
parents was restored; the full CLI output and the packaging root's genuine
blocked attempt were retained. No parent was retired and no generation
evidence was fabricated. Manual source capture establishes this root's
current intent and dependencies.
