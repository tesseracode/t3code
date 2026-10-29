# Feature Request: Normalize and verify executable permissions for Linux command payloads after extracting Windows-built wsl-runtime.tar.gz. When Copilot SDK is present, require and chmod the target Linux Copilot, rg, and tgrep executables before promoting the runtime; reject missing or non-executable payloads and invalidate warm caches whose modes are broken.

**Slug**: `wsl-runtime-executable-modes`
**Created**: 2026-09-10T00:23:25Z

## Description

Normalize and verify executable permissions for Linux command payloads after extracting Windows-built wsl-runtime.tar.gz. When Copilot SDK is present, require and chmod the target Linux Copilot, rg, and tgrep executables before promoting the runtime; reject missing or non-executable payloads and invalidate warm caches whose modes are broken.
