# Exploration: copilot-koffi-packaging-pin

## Fifth-run evidence

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

- `pnpm-workspace.yaml`: source of overrides copied into generated stages.
- `pnpm-lock.yaml`: records the source resolution and override.
- `scripts/build-desktop-artifact.ts`:
  - reads and resolves workspace overrides;
  - writes stage workspace configuration;
  - validates every Copilot-bearing stage and prunes the reviewed sidecar
    payload.
- `scripts/build-desktop-artifact.test.ts`: payload version and staging tests.
- `docs/operations/release.md`: Windows/WSL release invariants.

## Boundary

The generated stage package has no matching monorepo importer, so copying the
root lockfile and adding `--frozen-lockfile` is not a surgical fix. Scoped
overrides make the complete external SDK/runtime closure deterministic while
retaining the existing cross-platform stage topology.
