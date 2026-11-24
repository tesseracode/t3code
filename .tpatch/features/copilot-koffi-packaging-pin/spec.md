# Specification: copilot-koffi-packaging-pin

## Included behavior

1. Resolve the source-tested external closure exactly:
   - `@github/copilot@1.0.75`;
   - `koffi@3.3.1`;
   - `vscode-jsonrpc@8.2.1`;
   - `zod@4.4.3`;
   - `detect-libc@2.1.2`.
2. Propagate the five scoped overrides into every Copilot-bearing desktop
   production stage and standalone CLI archive through the existing resolved
   workspace override pipeline.
3. Resolve dependency manifests from the SDK/runtime package contexts and
   reject missing or mismatched versions before packaging.
4. Apply the guard before pruning/packing in macOS/Linux application stages,
   the Windows native server sidecar, and standalone CLI archives. WSL embeds
   the independent Linux archive unchanged, as do downstream SSH/update users.
5. Require the staged SDK itself to remain exactly 1.0.8.
6. Fail early when workspace override selectors drift from enforced versions.
7. Keep non-Copilot stages unchanged.
8. Document that Copilot native dependency versions are pinned because stage
   manifests are generated independently of monorepo importers.
9. Require target platform packages at CLI 1.0.75 and Koffi bindings at 3.3.1.
   Every resolved package stays inside its stage. Native layouts remain owned
   by the pruning root, including universal macOS.
10. Generated glibc stages explicitly exclude the reviewed CLI's musl optional
    packages; cross-host pnpm installation may include both despite the libc
    target. Keep source installation and other targets unchanged.

## Acceptance criteria

1. A fresh generated stage resolves the five source-tested versions.
2. Missing packages, wrong SDK anchors, missing/drifting overrides and any
   unreviewed installed version are rejected before pruning deletes files.
3. Existing x64, arm64 and universal payload-pruning tests pass with reviewed
   3.3.1 fixtures; no historical Koffi version is restored blindly.
4. Workspace lockfile remains internally consistent.
5. Focused packaging tests, scripts typecheck, and changed-file lint pass.
6. Hoisted and strict owner resolution reject misleading root-only versions
   and out-of-stage symlinks. No-Copilot stages need no closure or overrides.
7. Fresh generated dependency stages match source resolution. Inspection of
   foreign packages on macOS is not target-host execution or complete artifact
   qualification; those remain separate stable-stack gates.

## Relationship

Soft ordering edge to `copilot-package-payload-pruning`; exact recipe preimages
protect the overlapping implementation files.
