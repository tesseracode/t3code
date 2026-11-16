# Canonical configured-root exclusion

The existing scanner test for a symlink into configured worktrees fails on both
the unchanged base and the import candidate on macOS. Candidate real paths use
`/private/var` while the configured exclusion root can use `/var`.

Retain lexical exclusions and add canonical base/worktree roots. No wire schema,
UI, provider execution, or read-only history behavior changes are needed.
