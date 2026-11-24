# Apply Packet: tpatch-local-capture-ignore

## Request
# Feature Request: Record the already-shipped .tpatch/local/ ignore rule so a clean same-base replay includes the local-only private capture exclusion. This is historical intent adoption, not a new product behavior.

**Slug**: `tpatch-local-capture-ignore`
**Created**: 2026-10-29T07:20:20Z

## Description

Record the already-shipped .tpatch/local/ ignore rule so a clean same-base replay includes the local-only private capture exclusion. This is historical intent adoption, not a new product behavior.


## Spec
# Specification

- A clean v0.0.42 replay ignores `.tpatch/local/` through the tracked ignore file.
- Canonical intent contains only the already-shipped one-line `.gitignore` delta.
- No local capture bodies, credentials, machine state, or generated artifacts
  are committed.
- All tracked files outside `.tpatch/` match the audited mobile baseline after
  replaying the seven maintained roots and this maintenance root.

This record adopts existing behavior. It does not claim new product work or
independent visual validation.


## Exploration
# Exploration

Upstream base: `719a76ca1dbf5490f1aa33ffb9966301e02be9a9`.
Audited target: `aeb0b48220d2cb83698e2298a163261f75ec5681`.
The target `.gitignore` already includes `.tpatch/local/` below `.plans/`.

Use a scoped committed-range record for `.gitignore` from the actual upstream
base. The explicit apply session documents historical adoption, not a fictitious
execution of a recipe on already-modified input.

