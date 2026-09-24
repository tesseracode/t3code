# Specification: copilot-runtime-packaging

## Exact dependency closure

1. Require SDK 1.0.8, CLI and matching platform packages 1.0.75, Koffi and
   matching native bindings 3.3.1, vscode-jsonrpc 8.2.1, Zod 4.4.3 and
   detect-libc 2.1.2.
2. Carry all five owner-scoped overrides through generated desktop and CLI
   workspace configurations. Source lockfile importers do not freeze those
   independently generated stages.
3. Before pruning or packing, resolve SDK dependencies from the actual SDK
   owner and detect-libc from the CLI owner. Reject missing packages, wrong
   anchors/overrides/versions and out-of-stage resolution. A correct root
   copy cannot hide a different owner-local dependency.
4. Generated glibc stages exclude the reviewed CLI's musl optional packages;
   source installs and other targets remain unchanged.

## Reviewed payload pruning

1. Use the shared helper in macOS/Linux desktop, Windows server sidecar and
   standalone CLI stages. Keep WSL's Linux archive unchanged.
2. Validate every target's complete native inventory and required loaders
   before deleting anything. Reject foreign packages, ambiguous/partial
   layouts, unexpected natives and symlink escapes.
3. Preserve the native CLI, core binaries, target rg/tgrep, specialized
   clipboard bindings/loaders, SDK entry, Koffi and Windows computer-use
   executables. Remove only reviewed generic clipboard duplicates,
   interactive voice/webview/Foundry content, foreign search binaries and
   Koffi musl bindings from glibc stages.
4. Preserve both CPUs for universal macOS. Removed-native counts are 9/11
   for Windows x64/arm64, 10/11 for Linux x64/arm64, 10/9 for macOS x64/arm64
   and 19 for universal macOS. Counts supplement required-file checks.
5. Already completely pruned stages are idempotent. Stages without a declared
   Copilot SDK are unchanged; a declared but missing SDK fails explicitly.
6. Keep upstream's complete Windows unpacked-application limit of 80 files.

## WSL installation and warm caches

1. Detect any Copilot package entry. Require SDK/runtime manifests and exactly
   one host-matching Linux platform package with regular, non-symlinked
   copilot, rg and tgrep files and paths.
2. After hash-verified extraction and before promotion, normalize the three
   commands to 0755 and verify executability. Missing or ambiguous layouts
   fail before promotion.
3. Revalidate executable readiness on warm reuse. Remember Copilot presence
   in the digest marker so complete payload loss also invalidates a cache.
4. Windows archive validation requires each matching manifest/command
   exactly once and rejects missing, duplicate, foreign or extra commands.
5. Retain upstream archive hashes, entry probes, locks, in-use-tree handling,
   mounted fallback and non-Copilot behavior.
6. Preserve newline-delimited executable fixtures: copilot, rg and tgrep
   each explicitly emit a trailing newline.

## Consolidation acceptance

1. The canonical patch contains the complete 13-path packaging delta from
   the real pre-packaging baseline, not a last-commit fixup or cumulative
   provider/foundation patch.
2. Recipe preimages come from that baseline; current recipe and patch replay
   and landing evidence pass the unmodified tpatch verifier.
3. Product source bytes are identical before and after consolidation.
4. Original packaging patches, recipes, generations and landing commits
   remain intact. Explicit supersedes edges move default maintenance to this
   root; no historical verification record is relabelled as successful.
5. The replacement and other maintained roots verify; the DAG has no
   violations. Focused regression tests preserve behavior.

## Separate qualification gates and non-goals

Full native macOS/Linux/Windows/WSL artifacts, complete installer execution,
Windows whole-app file count and real native-session continuity remain
required. Portable shell tests and Copilot-only stages do not substitute.
No live-state migration, provider upgrade, UI change, new orchestrator,
replay bypass, global tool upgrade or historical evidence fabrication.
