# Specification: copilot-package-payload-pruning

## Acceptance criteria

1. One helper is wired before packing every Copilot-bearing desktop/server
   stage and standalone CLI archive. WSL receives the Linux archive verbatim.
2. For the reviewed versions, remove only generic clipboard duplicates,
   interactive voice/webview/Foundry payloads, non-target search binaries and
   Koffi musl bindings from glibc Linux targets.
3. Preserve required native CLI/core/search, specialized clipboard and its
   loaders, SDK entry, target Koffi, and both Windows computer-use executables.
4. Verify package ownership/version, all required files, native layout and stage
   containment before any deletion. Reject external/internal unexpected symlinks,
   foreign staged platforms and partial/unreviewed layouts explicitly.
5. Repeated pruning of an already-complete pruned stage is a no-op. Stages that
   do not declare Copilot are untouched; declared missing packages fail.
6. Review all x64/arm64 Windows, Linux/glibc and macOS targets. Universal macOS
   preserves both CPU payloads. Expected removed-native counts are 9/11 for
   Windows x64/arm64, 10/11 for Linux x64/arm64, 10/9 for macOS x64/arm64 and
   19 for universal macOS. Counts do not replace required-file validation.
7. The upstream 80-file complete Windows artifact limit remains unchanged.
8. Focused tests cover preservation, idempotency, no-Copilot stages, version and
   layout drift, foreign packages, symlink escapes and preflight-before-delete.
   Real isolated staging demonstrates retained bytes and runnable local payloads.

## External gates

Complete target-host Windows/WSL/Linux packaging and native session execution
remain required on the assembled stack. A Copilot-only ASAR count is not proof
that the entire Windows application fits its 80-file limit. Exact generated
stage closure validation is the next dependent packaging concern.

## Dependency

Hard parent: `windows-portable-packaging-tests`.
