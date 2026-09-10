# Exploration: wsl-runtime-executable-modes

## Windows evidence

- Windows payload validation: 78/80 files.
- Native backend: HTTP 200.
- Packaged Copilot approval and SDK → CLI → SDK continuity: passed.
- WSL archive Copilot entry: mode `0666`.
- Extracted WSL Copilot: mode `0644`.
- Direct execution: exit 126 / `Permission denied`.
- Linux `rg` and `tgrep` also lacked execute bits.

## Integration points

- `apps/desktop/src/wsl/DesktopWslEnvironment.ts`
  - generates the verified extraction/cache-promotion shell script;
  - owns warm-cache readiness.
- `apps/desktop/src/wsl/DesktopWslEnvironment.test.ts`
  - executes the generated install script against real temporary archives.
- `scripts/build-desktop-artifact.ts`
  - validates archive hash and membership.
- `scripts/build-desktop-artifact.test.ts`
  - covers Windows WSL archive structure.
- `docs/operations/release.md`
  - documents release payload invariants.

## Boundary

Do not rely on Windows-side `chmod` or archive entry modes. Normalize only
after extraction on the Linux filesystem.
