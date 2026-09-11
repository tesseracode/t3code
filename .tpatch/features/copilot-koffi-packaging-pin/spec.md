# Specification: copilot-koffi-packaging-pin

## Included behavior

1. Resolve the source-tested external closure exactly:
   - `@github/copilot@1.0.75`;
   - `koffi@3.1.6`;
   - `vscode-jsonrpc@8.2.1`;
   - `zod@4.4.3`;
   - `detect-libc@2.1.2`.
2. Propagate the scoped override into both desktop production stages through
   the existing workspace override pipeline.
3. Resolve dependency manifests from the SDK/runtime package contexts and
   reject missing or mismatched versions before packaging.
4. Apply the guard to macOS/Linux application stages and the Windows/WSL
   server sidecar.
5. Require the staged SDK itself to remain exactly 1.0.8.
6. Fail early when workspace override selectors drift from enforced versions.
7. Keep non-Copilot stages unchanged.
8. Document that Copilot native dependency versions are pinned because stage
   manifests are generated independently of monorepo importers.

## Acceptance criteria

1. A fresh generated stage resolves the five source-tested versions.
2. Koffi 3.2.0 is rejected before an artifact is accepted.
3. Existing x64 and arm64 payload-pruning tests pass with 3.1.6 fixtures.
4. Workspace lockfile remains internally consistent.
5. Focused packaging tests, scripts typecheck, and changed-file lint pass.

## Relationship

Soft ordering edge to `copilot-package-payload-pruning`; exact recipe preimages
protect the overlapping implementation files.
