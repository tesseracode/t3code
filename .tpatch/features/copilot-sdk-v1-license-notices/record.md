# Implementation Record: copilot-sdk-v1-license-notices

**Recorded**: 2026-11-02T22:00:57Z
**Files changed**: 2
**Patch size**: 5879 bytes
**Capture mode**: working-tree-all
**Pathspecs**: third-party-licenses.config.json,scripts/lib/third-party-licenses.test.ts

## Change Summary

```
 scripts/lib/third-party-licenses.test.ts | 52 ++++++++++++++++++
 third-party-licenses.config.json         | 90 ++++++++++++++++++++++++++++++++
 2 files changed, 142 insertions(+)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: third-party-licenses.config.json, scripts/lib/third-party-licenses.test.ts
- **claim_ids**: (none)
- **base_commit**: `8a3e34631cca72fcf79327c5c625077ba71800ae`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-sdk-v1-license-notices/artifacts/post-apply.patch
```

