# Implementation Record: turn-fold-bottom-affordance

**Recorded**: 2026-11-05T18:58:06Z
**Files changed**: 4
**Patch size**: 17967 bytes
**Capture mode**: working-tree-all
**Pathspecs**: apps/web/src/components/chat/MessagesTimeline.logic.ts,apps/web/src/components/chat/MessagesTimeline.tsx,apps/web/src/components/chat/timelineRowContext.ts,apps/web/src/components/chat/MessagesTimeline.browser.test.tsx

## Change Summary

```
 .../chat/MessagesTimeline.browser.test.tsx         |  95 ++++++++++++++++++++
 .../src/components/chat/MessagesTimeline.logic.ts  |  59 ++++++++----
 apps/web/src/components/chat/MessagesTimeline.tsx  | 100 ++++++++++++++++++---
 apps/web/src/components/chat/timelineRowContext.ts |   4 +-
 4 files changed, 229 insertions(+), 29 deletions(-)
```

## Capture Provenance

- **capture_mode**: `working-tree-all`
- **pathspecs**: apps/web/src/components/chat/MessagesTimeline.logic.ts, apps/web/src/components/chat/MessagesTimeline.tsx, apps/web/src/components/chat/timelineRowContext.ts, apps/web/src/components/chat/MessagesTimeline.browser.test.tsx
- **claim_ids**: (none)
- **base_commit**: `cdfe5682804389e2be74a5de9b0043b6a3a03941`
- **upper_commit**: `working-tree`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/turn-fold-bottom-affordance/artifacts/post-apply.patch
```

