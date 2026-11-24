# Implementation Record: attention-inbox

**Recorded**: 2026-09-30T07:03:04Z
**Files changed**: 16
**Patch size**: 50148 bytes
**Capture mode**: staged-index
**Pathspecs**: apps/web/src/components/AppSidebarLayout.tsx,apps/web/src/components/CommandPalette.tsx,apps/web/src/components/attention/AttentionInbox.tsx,apps/web/src/components/attention/AttentionSidebarItem.tsx,apps/web/src/components/attention/AttentionWorkspaceRetention.tsx,apps/web/src/components/attention/attentionInbox.logic.test.ts,apps/web/src/components/attention/attentionInbox.logic.ts,apps/web/src/components/attention/useOpenAttentionInbox.ts,apps/web/src/components/sidebar/SidebarChrome.tsx,apps/web/src/routeTree.gen.ts,apps/web/src/routes/_chat.attention.tsx,docs/internals/overview.md,docs/user/attention.md,docs/user/keybindings.md,docs/user/thread-sidebar.md,packages/contracts/src/keybindings.ts

## Capture Provenance

- **capture_mode**: `staged-index`
- **pathspecs**: apps/web/src/components/AppSidebarLayout.tsx, apps/web/src/components/CommandPalette.tsx, apps/web/src/components/attention/AttentionInbox.tsx, apps/web/src/components/attention/AttentionSidebarItem.tsx, apps/web/src/components/attention/AttentionWorkspaceRetention.tsx, apps/web/src/components/attention/attentionInbox.logic.test.ts, apps/web/src/components/attention/attentionInbox.logic.ts, apps/web/src/components/attention/useOpenAttentionInbox.ts, apps/web/src/components/sidebar/SidebarChrome.tsx, apps/web/src/routeTree.gen.ts, apps/web/src/routes/_chat.attention.tsx, docs/internals/overview.md, docs/user/attention.md, docs/user/keybindings.md, docs/user/thread-sidebar.md, packages/contracts/src/keybindings.ts
- **claim_ids**: (none)
- **base_commit**: `26b7eb894d1ce095c3469b9451ea9f0c4172c1ae`
- **upper_commit**: `working-tree`
- **dirty_state**: 16 staged paths, 0 unrelated unstaged paths

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/attention-inbox/artifacts/post-apply.patch
```

