# Progress: windows-wsl-support

## Status: Phase 0 — In Progress (implementing)

## Research Complete ✅
- Desktop spawning flow analyzed (main.ts lines 1371-1470)
- Upstream issues reviewed (#671 BackendTarget, #170 WSL interop, #716 UNC paths, #870 latency)
- VS Code remote architecture pattern validated
- Component analysis: what runs inside WSL vs Windows boundary
- Plan written at `.claude/plans/goofy-zooming-hollerith.md`

## Key Findings
- `startBackend()` spawns server via `ChildProcess.spawn(process.execPath, [backendEntry])`
- Bootstrap config via fd 3 pipe (JSON) — likely won't work across wsl.exe, need CLI arg fallback
- Server entry: `apps/server/dist/bin.mjs`, CWD: `OS.homedir()`
- Terminal/PTY, git, fs, provider CLIs all need to run inside WSL for WSL projects
- WSL2 shares host network stack — localhost TCP works cross-boundary

## Phase 0 — BackendTarget Abstraction
- [x] Extract `BackendTarget` interface from `startBackend()` in main.ts
- [x] Implement `LocalBackendTarget` wrapping existing logic
- [x] Verify no regression on existing local flow (typecheck passes)
- [x] Typecheck passes

## Phase 1 — WSL Server Spawning (MVP)
- [x] Implement `WslBackendTarget` with `wsl.exe` spawning
- [x] WSL distro detection (`wsl.exe --list --quiet`)
- [x] Implement CLI arg fallback for bootstrap config (`--bootstrap-json`)
- [x] Path translation at boundary (`wslpath` + manual fallback)
- [x] WSL path detection (`isWslPath`, `extractWslDistroFromPath`)
- [x] Node.js availability check inside WSL
- [x] Server installation check inside WSL
- [ ] Server auto-install inside WSL (`~/.t3/server/`) — needs testing on Windows
- [ ] Desktop settings: add backend target preference — future UI work
- [ ] Test: open WSL project, terminal works, git works — needs Windows testing
- [ ] Test: at least one provider (Copilot) works for WSL sessions — needs Windows testing

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
