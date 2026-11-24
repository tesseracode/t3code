# Acceptance

- Preserve the existing SDK 1.0.8 override.
- Generate notices for SDK 1.0.28 and darwin, win32, linux and linuxmusl native
  x64/arm64 packages using the pinned upstream MIT license and GitHub attribution.
- Keep exact package/version matching and strict missing-notice failures.
- Cover generated output for every native target with the existing license runner.
- Restore actual Metro startup without changing runtime selection or defaults.
- Preserve hard prerequisites and disclose native replay refusal if ancestor
  overlap prevents verification; do not claim manual proof is native verification.
