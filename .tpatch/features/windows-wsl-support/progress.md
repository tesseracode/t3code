# Progress: windows-wsl-support

## Status: Phase 1 — Windows-tested, partial

## Research Complete ✅
- Desktop spawning flow analyzed (main.ts lines 1371-1470)
- Upstream issues reviewed (#671 BackendTarget, #170 WSL interop, #716 UNC paths, #870 latency)
- VS Code remote architecture pattern validated
- Component analysis: what runs inside WSL vs Windows boundary
- Plan written at `.claude/plans/goofy-zooming-hollerith.md`

## Key Findings
- `startBackend()` spawns server via `ChildProcess.spawn(process.execPath, [backendEntry])`
- Bootstrap config via fd 3 pipe (JSON) — doesn't work across wsl.exe, using CLI arg fallback
- Server entry: `apps/server/dist/bin.mjs`, CWD: `OS.homedir()`
- Terminal/PTY, git, fs, provider CLIs all need to run inside WSL for WSL projects
- WSL2 shares host network stack — localhost TCP works cross-boundary
- **Critical**: `wsl.exe --` passes args through default shell (zsh) which expands `$VAR`. Must use `--exec` to bypass.
- **Critical**: `wsl.exe --list --quiet` outputs UTF-16LE with null bytes, must decode properly.
- **Critical**: nvm-managed Node.js is not on default PATH in WSL; must source `$NVM_DIR/nvm.sh`
- All WSL helper commands should use `execFileSync` (not `execSync`) to avoid shell-string fragility.

## Phase 0 — BackendTarget Abstraction
- [x] Extract `BackendTarget` interface from `startBackend()` in main.ts
- [x] Implement `LocalBackendTarget` wrapping existing logic
- [x] Verify no regression on existing local flow (typecheck passes)
- [x] Typecheck passes

## Phase 1 — WSL Server Spawning (MVP)
- [x] Implement `WslBackendTarget` with `wsl.exe` spawning
- [x] WSL distro detection (`wsl.exe --list --quiet`) — fixed UTF-16LE decoding
- [x] Implement CLI arg fallback for bootstrap config (`--bootstrap-json`)
- [x] Path translation at boundary (`wslpath` + manual fallback)
- [x] WSL path detection (`isWslPath`, `extractWslDistroFromPath`)
- [x] Node.js availability check inside WSL — fixed nvm/fnm support via `--exec`
- [x] Server installation check inside WSL
- [x] Server auto-install function (`installServerInWsl`) — code written, needs server build
- [x] WSL auto-detection wired into `createDefaultBackendTarget()`
- [x] All WSL commands use `execFileSync` (no shell interpolation)
- [x] All WSL commands use `--exec` (bypass default shell variable expansion)
- [x] `bash -c` with positional args for safe JSON passing (no shell injection)
- [x] `bun typecheck`, `bun fmt`, `bun lint` pass (0 errors)
- [ ] Desktop settings: add backend target preference — future UI work
- [ ] Test: server build on Windows (blocked by tsdown/path-with-spaces issue)
- [ ] Test: open WSL project, terminal works, git works — needs server dist
- [ ] Test: at least one provider (Copilot) works for WSL sessions — needs server dist

## Phase 2 — Dual-Server (separate feature if large)
- [ ] Backend manager for multiple targets
- [ ] Project-to-target routing based on path prefix
- [ ] Distro picker UI

## tpatch Tracking
- [ ] Record patch
- [ ] Generate recipe: `node .tpatch/tools/generate-recipe.cjs windows-wsl-support <base> HEAD`
- [ ] Verify patch scope (no pollution)
- [ ] Update spec.md with implementation findings
- [ ] Commit tpatch metadata
