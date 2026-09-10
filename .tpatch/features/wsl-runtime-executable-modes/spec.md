# Specification: wsl-runtime-executable-modes

## Included behavior

1. Detect a Copilot-bearing WSL runtime through either
   `node_modules/@github/copilot-sdk/package.json` or a Linux Copilot package.
2. Require exactly one `@github/copilot-linux-*` runtime package.
3. Require its:
   - `copilot`;
   - `ripgrep/bin/linux-*/rg`;
   - `tgrep/bin/linux-*/tgrep`.
4. After extraction, run `chmod 0755` on all three and verify `-x`.
5. Include executable readiness in the warm-cache short circuit.
6. Require the target-architecture members and reject ambiguous layouts
   during Windows payload validation.
7. Leave non-Copilot runtime installation unchanged.

## Acceptance criteria

1. A Windows-style archive whose executable entries are `0644` installs with
   all three files executable.
2. A warm cache whose Copilot executable loses its execute bit is treated as a
   miss and repaired.
3. Missing or ambiguous Copilot executable layouts fail before cache
   promotion.
4. Windows artifact validation rejects a Copilot-bearing WSL archive missing
   any required executable member or containing extra target commands.
5. Existing WSL cache, packaging, typecheck, and lint tests pass.
6. A real Windows-built package starts the WSL Copilot runtime.

## Dependency

Hard parent: `copilot-package-payload-pruning`.
