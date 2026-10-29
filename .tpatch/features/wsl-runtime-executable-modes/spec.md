# Specification: wsl-runtime-executable-modes

## Included behavior

1. Detect a Copilot-bearing WSL runtime through any Copilot package entry.
2. Require the SDK/runtime manifests and exactly one matching
   `@github/copilot-linux-*` platform package, with no symlinked paths.
3. Require its:
   - `copilot`;
   - `ripgrep/bin/linux-*/rg`;
   - `tgrep/bin/linux-*/tgrep`.
4. After extraction, run `chmod 0755` on all three and verify `-x`.
5. Include executable readiness in the warm-cache short circuit. Remember
   Copilot presence in the entry-digest marker, so deletion of the entire
   Copilot subtree cannot turn a broken cache into a healthy non-Copilot cache.
6. Require the target-architecture members and reject ambiguous layouts
   during Windows payload validation.
7. Leave non-Copilot runtime installation unchanged. Preserve upstream's
   archive hash, executable probe, locks, in-use trees and mounted fallback.
8. Consume the single-stem Linux CLI release archive unchanged; never restore
   the historical combined Windows/Linux node_modules stage.
9. Fold the fixture-newline child into executable tests that explicitly emit
   `copilot\n`, `rg\n` and `tgrep\n`.

## Acceptance criteria

1. A Windows-style archive whose executable entries are `0644` installs with
   all three files executable.
2. A warm cache whose Copilot commands lose execute bits, or whose entire
   Copilot subtree disappears, is treated as a miss and repaired.
3. Missing or ambiguous Copilot executable layouts fail before cache
   promotion.
4. Windows artifact validation rejects a Copilot-bearing WSL archive missing
   any required executable member or containing extra target commands.
5. Existing WSL cache, packaging, typecheck, and lint tests pass.
6. A real Windows-built package starts the WSL Copilot runtime. This is a
   target-platform qualification gate, not proved by portable shell tests.

## Dependency

Hard parent: `copilot-package-payload-pruning`.
