# Analysis: windows-wsl-support

## Summary
Full Windows and WSL support for T3 Code. Requires a dual-server architecture: a native Windows server for Windows filesystem projects, and a WSL-spawned server for Linux-side projects. Includes WSL distro detection, `wsl.exe` server spawning, `wslpath` translation, auto-install of the server binary inside WSL, native `inotify` file watching, and Copilot SDK binary resolution on Windows.

## Compatibility
- Major platform expansion; currently macOS/Linux only.
- Requires new platform-detection logic, path translation layers, and process spawning strategies.
- Copilot SDK binary resolution needs Windows-specific path handling.

## Risk: High
- Large surface area: filesystem, process management, path translation, binary resolution.
- WSL interop introduces edge cases (network, permissions, path formats).
- No existing Windows CI infrastructure to validate against.
