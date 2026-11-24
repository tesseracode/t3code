# Exploration: wsl-runtime-executable-modes

## Historical Windows evidence (v0.0.38 foundation)

- Windows payload validation: 78/80 files.
- Native backend: HTTP 200.
- Packaged Copilot approval and SDK → CLI → SDK continuity: passed.
- WSL archive Copilot entry: mode `0666`.
- Extracted WSL Copilot: mode `0644`.
- Direct execution: exit 126 / `Permission denied`.
- Linux `rg` and `tgrep` also lacked execute bits.

## Integration points

- `packages/shared/src/copilotRuntime.ts`
  - shares archive membership rules and executable shell checks;
  - portable shell tests execute production functions, not a simulated installer.
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
after extraction on the Linux filesystem. v0.0.42 archives have a versioned
single directory stripped during extraction. Mark Copilot-bearing cache
digests so complete payload loss is detected on later reuse.

The old generation's hard-parent snapshot predates the pruning port.
Read-only reconcile refused with `parent-generation-stale`; manual adaptation
against the landed parent is followed by real apply/record, not an invented
generation manifest or dependency bypass.
