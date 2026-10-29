# Analysis: copilot-package-payload-pruning

## Problem

The original Windows x64 package exceeded upstream's 80-file budget. Its
combined Windows/Linux stage is obsolete on v0.0.42: WSL now embeds the
independently built Linux CLI archive, while Windows native uses its own ASAR.
Retain reviewed SDK-server pruning without restoring the old staging topology.

## Compatibility

The shared staging helper covers the Windows sidecar, macOS/Linux desktop
stage and standalone CLI archives. Stages without a declared SDK are unchanged;
a declared but missing SDK is an error. The reviewed versions are SDK `1.0.8`,
CLI/platform `1.0.75` and the adopted source Koffi `3.3.1`.

Verify all target files, owners, native layouts and stage containment before
deletion. Preserve native CLI/core/search, specialized clipboard/loaders, Koffi
and Windows computer-use. Remove only known duplicate/interactive files and
non-target search/libc bindings. Universal macOS keeps both target CPUs.
Already-pruned complete layouts are valid; partially pruned unknown layouts
fail rather than silently masking drift.

## Recommendation

Keep the performance budget unchanged. Per-target removal counts replace the
old combined-stage count. Real macOS runtime/clipboard and retained-byte proofs,
strict-linker containment, actual Windows ASAR membership and focused fixtures
provide source-level evidence; they do not replace target-host packaging gates.
Exact all-stage transitive dependency pinning remains the closure root's job.
