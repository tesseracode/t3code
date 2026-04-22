# Spec: windows-wsl-support

## Acceptance Criteria
1. T3 Code launches and runs on native Windows (no WSL required for Windows-side projects).
2. Projects inside WSL distros can be opened and edited from the Windows host.
3. WSL distros are auto-detected via `wsl.exe --list`.
4. A separate server process is spawned inside WSL for Linux-side projects.
5. Path translation between Windows (`C:\...`) and WSL (`/mnt/c/...`) paths works transparently via `wslpath`.
6. Server binary is auto-installed inside WSL on first use.
7. File watching uses native `inotify` inside WSL (not polling).
8. Copilot SDK binary resolves correctly on Windows (`.exe` suffix, correct platform package).

## Out of Scope
- Linux desktop (non-WSL) GUI support.
- Remote SSH server support.
- Windows ARM64 (initial release).

## Plan
1. Add Windows platform detection and native server support.
2. Implement WSL distro discovery (`wsl.exe --list --quiet`).
3. Build WSL server spawning via `wsl.exe -d <distro> -- <server-binary>`.
4. Implement `wslpath` translation layer for cross-boundary path resolution.
5. Add auto-install flow for server binary inside WSL distros.
6. Fix Copilot SDK binary resolution for Windows targets.
7. Set up Windows CI pipeline for smoke testing.
