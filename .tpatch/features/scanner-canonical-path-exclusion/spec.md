# Acceptance

- Exclude canonical aliases of configured base and worktree roots.
- Retain lexical matching and existing handling of nonexistent roots.
- Existing symlink regression fails before the fix and passes after it.
- All five focused import validation files pass without exclusions.
- Server typecheck, targeted lint, independent review, canonical recipe replay,
  and fresh landing attestation pass.
- Preserve the original import commit and its complete recorded patch.
