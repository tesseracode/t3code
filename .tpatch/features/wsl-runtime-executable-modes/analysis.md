# Analysis: wsl-runtime-executable-modes

## Problem

A real Windows x64 package passed the 78-file payload gate, native Windows
backend startup, and packaged Copilot approval/session continuity. The WSL
runtime then failed with exit 126 because Windows `tar` archived the Linux
Copilot executable as mode `0666`; extraction onto WSL ext4 yielded `0644`.
The retained Linux `rg` and `tgrep` entries had the same defect.

NTFS does not provide trustworthy POSIX execute metadata to the Windows archive
creator. Archive bytes and membership were valid, so neither the digest nor
existing archive validation detected the problem.

## Compatibility

- Normalize modes after verified extraction inside WSL, where POSIX modes are
  authoritative.
- Apply whenever a Linux Copilot payload or its SDK marker is present.
- Require exactly one Linux Copilot package and its `copilot`, `rg`, and
  `tgrep` files.
- Warm-cache readiness must require all three executables so previously
  promoted broken caches reinstall rather than remain sticky.
- Builds without Copilot keep their current behavior.
- The mounted Windows-tree fallback is unchanged.

## Recommendation

Add one shared executable-payload check to the WSL install script, normalize
the three modes to `0755` before promotion, and have Windows artifact
validation require those archive members whenever Copilot payload is present.
