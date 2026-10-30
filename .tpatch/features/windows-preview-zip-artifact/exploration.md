# Exploration

- `.github/workflows/fork-native-preview.yml` builds Linux first, verifies its
  provenance in the Windows job, then hardcodes `--target nsis`. Its upload
  paths include only EXE plus provenance files.
- `scripts/build-desktop-artifact.ts` passes the selected target to
  `buildConfig.win.target`. The existing Windows validation reads
  `win-unpacked`, independently of the final installer/archive format.
- `scripts/lib/fork-preview.ts` retains the isolated preview identity and
  disables publication. This feature does not alter it.
- `scripts/fork-preview-manifest.mjs` already recognizes ZIP, computes its
  exact SHA-256, verifies version-only build transforms and records the source
  commit and embedded Linux runtime.

The surgical change is a dispatch choice, an allowlist check, use of that
choice for the existing builder, and upload coverage for ZIP. Existing
packaging helpers do not need another abstraction or dependency.
