# Exploration: copilot-koffi-packaging-pin

## Historical fifth-run evidence (v0.0.38 foundation)

- Seven focused files passed: 192 tests plus one capability skip.
- Linux node-pty passed.
- Windows NSIS packaging produced 78 files.
- Both `server.asar` and `wsl-runtime.tar.gz` contained Koffi 3.2.0.
- Source lockfile and source installation contained Koffi 3.1.6.
- Copilot SDK 1.0.8 declares `koffi: ^3.1.0`.
- Its external runtime closure also declares ranged vscode-jsonrpc, Zod, and
  detect-libc dependencies; a fresh probe already selected Zod 4.6.1 instead
  of the source-tested 4.4.3.

## Integration points

- v0.0.42 source resolution now contains reviewed Koffi 3.3.1. The other
  reviewed closure versions remain SDK 1.0.8 / CLI 1.0.75 / JSON-RPC 8.2.1 /
  Zod 4.4.3 / detect-libc 2.1.2.
- `pnpm-workspace.yaml`: source of overrides copied into generated stages.
- `pnpm-lock.yaml`: records the source resolution and override.
- `scripts/build-desktop-artifact.ts`:
  - reads and resolves workspace overrides;
  - writes stage workspace configuration;
  - validates every Copilot-bearing stage and prunes the reviewed sidecar
    payload.
- `scripts/build-desktop-artifact.test.ts`: payload version and staging tests.
- `scripts/lib/copilot-payload.ts`: shared owner-context closure resolution
  and containment, exact override and version checks before native pruning.
- `scripts/lib/copilot-payload.test.ts`: actual temporary package layouts,
  wrong/missing transitives and overrides, source manifest consistency,
  strict links, hoisted packages and all reviewed target native layouts.
- `scripts/build-cli-archive.ts`: independent hoisted externals stage, checked
  before package-manager manifests/metadata are removed.
- `docs/operations/release.md`: Windows/WSL release invariants.

## Boundary

The generated stage package has no matching monorepo importer, so copying the
root lockfile and adding `--frozen-lockfile` is not a surgical fix. Scoped
overrides make the complete external SDK/runtime closure deterministic while
retaining the existing cross-platform stage topology.
