# Progress: windows-wsl-support

## Phase 0 — BackendTarget Abstraction
- [ ] Extract `BackendTarget` interface from `startBackend()` in main.ts
- [ ] Implement `LocalBackendTarget` wrapping existing logic
- [ ] Verify no regression on existing local flow
- [ ] Typecheck passes

## Phase 1 — WSL Server Spawning (MVP)
- [ ] Implement `WslBackendTarget` with `wsl.exe` spawning
- [ ] WSL distro detection (`wsl.exe --list --quiet`)
- [ ] Spike: test fd 3 bootstrap pipe across wsl.exe boundary
- [ ] Implement CLI arg fallback for bootstrap config (`--bootstrap-json`)
- [ ] Server auto-install inside WSL (`~/.t3/server/`)
- [ ] Path translation at boundary (`wslpath`)
- [ ] Desktop settings: add backend target preference
- [ ] Test: open WSL project, terminal works, git works
- [ ] Test: at least one provider (Copilot) works for WSL sessions

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
