# Specification

- A clean v0.0.42 replay ignores `.tpatch/local/` through the tracked ignore file.
- Canonical intent contains only the already-shipped one-line `.gitignore` delta.
- No local capture bodies, credentials, machine state, or generated artifacts
  are committed.
- All tracked files outside `.tpatch/` match the audited mobile baseline after
  replaying the seven maintained roots and this maintenance root.

This record adopts existing behavior. It does not claim new product work or
independent visual validation.
