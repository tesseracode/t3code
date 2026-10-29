# Exploration

Upstream base: `719a76ca1dbf5490f1aa33ffb9966301e02be9a9`.
Audited target: `aeb0b48220d2cb83698e2298a163261f75ec5681`.
The target `.gitignore` already includes `.tpatch/local/` below `.plans/`.

Use a scoped committed-range record for `.gitignore` from the actual upstream
base. The explicit apply session documents historical adoption, not a fictitious
execution of a recipe on already-modified input.
