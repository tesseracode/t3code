# Analysis: copilot-koffi-packaging-pin

## Problem

Desktop packaging creates generated production workspaces for the application
and Windows/WSL server sidecar. Those manifests differ from the monorepo
importers, so the source lockfile is not reusable as a frozen stage lockfile.
The stage copies workspace overrides, then performs a fresh production
resolution.

Copilot SDK 1.0.8 declares `koffi: ^3.1.0`. The source lockfile resolved
3.1.6, but the fifth Windows run resolved newly released 3.2.0 into both
`server.asar` and `wsl-runtime.tar.gz`. The same lockfile-free mechanism also
allows its external vscode-jsonrpc and Zod dependencies, plus Copilot's
detect-libc dependency, to float away from source-tested versions.

## Compatibility

- Add scoped overrides for the complete external Copilot runtime closure.
- Preserve the existing generated-stage architecture and production install.
- Validate the resolved closure in every Copilot-bearing desktop stage so
  missing override propagation or future drift fails during build.
- Leave stages without Copilot unchanged.
- Do not claim Koffi 3.2.0 is functionally broken; the defect is unreviewed
  release drift.

## Recommendation

Pin the SDK/runtime edges in `pnpm-workspace.yaml`, update the root lockfile
through pnpm, and validate the installed closure before packaging.
