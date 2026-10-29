# Specification: wsl-runtime-fixture-newlines

## Acceptance criteria

1. The Copilot fixture prints `copilot\n`.
2. The ripgrep fixture prints `rg\n`.
3. The tgrep fixture prints `tgrep\n`.
4. The existing combined-output assertion passes unchanged.
5. The complete focused Windows/WSL test set remains green.

## Dependency

Hard parent: `wsl-runtime-executable-modes`.
