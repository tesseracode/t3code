# Analysis: copilot-koffi-packaging-pin

## Problem

Desktop packaging creates generated production workspaces for the application
and Windows native server sidecar. Standalone CLI archives now install their
own runtime externals; WSL embeds the Linux archive verbatim. These manifests differ from the monorepo
importers, so the source lockfile is not reusable as a frozen stage lockfile.
The stage copies workspace overrides, then performs a fresh production
resolution.

Copilot SDK 1.0.8 declares `koffi: ^3.1.0`. Historically the source lockfile resolved
3.1.6, but the fifth Windows run resolved newly released 3.2.0 into both
`server.asar` and `wsl-runtime.tar.gz`. The same lockfile-free mechanism also
allows its external vscode-jsonrpc and Zod dependencies, plus Copilot's
detect-libc dependency, to float away from source-tested versions.

The v0.0.42 port re-reviewed actual source resolution: SDK 1.0.8, CLI 1.0.75,
Koffi 3.3.1, vscode-jsonrpc 8.2.1, Zod 4.4.3 and detect-libc 2.1.2.
Use this closure, not the historical Koffi pin. Exact platform packages align
with the CLI and Koffi owners.

## Compatibility

- Add scoped overrides for the complete external Copilot runtime closure.
- Preserve the existing generated-stage architecture and production install.
- Validate the resolved closure in every Copilot-bearing desktop/CLI stage so
  missing override propagation or future drift fails during build.
- Leave stages without Copilot unchanged.
- Do not claim Koffi 3.2.0 is functionally broken; the defect is unreviewed
  release drift.

## Recommendation

Pin the SDK/runtime edges in `pnpm-workspace.yaml`, update the root lockfile
through pnpm, and validate the installed closure before packaging.
