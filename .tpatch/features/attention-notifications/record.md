# Implementation Record: attention-notifications

**Recorded**: 2026-10-01T15:12:06Z
**Files changed**: 30
**Patch size**: 120855 bytes
**Capture mode**: staged-index
**Pathspecs**: apps/web/src/attentionNotificationPolicy.test.ts,apps/web/src/attentionNotificationPolicy.ts,apps/web/src/components/AppSidebarLayout.tsx,apps/web/src/components/CommandPalette.tsx,apps/web/src/components/ThreadNotificationCoordinator.badge.test.tsx,apps/web/src/components/ThreadNotificationCoordinator.canonical.test.tsx,apps/web/src/components/ThreadNotificationCoordinator.test.tsx,apps/web/src/components/ThreadNotificationCoordinator.tsx,apps/web/src/components/attention/AttentionInbox.tsx,apps/web/src/components/attention/AttentionSidebarItem.tsx,apps/web/src/components/attention/AttentionWorkspaceRetention.tsx,apps/web/src/components/attention/attentionInbox.logic.test.ts,apps/web/src/components/attention/attentionInbox.logic.ts,apps/web/src/components/attention/useOpenAttentionInbox.ts,apps/web/src/components/settings/NotificationSettings.tsx,apps/web/src/components/settings/SettingsPanels.tsx,apps/web/src/components/settings/settingsSearch.ts,apps/web/src/components/sidebar/SidebarChrome.tsx,apps/web/src/routeTree.gen.ts,apps/web/src/routes/_chat.attention.tsx,apps/web/src/threadNotifications.ts,docs/internals/attention-notifications.md,docs/internals/overview.md,docs/user/attention.md,docs/user/keybindings.md,docs/user/notifications.md,docs/user/thread-sidebar.md,packages/contracts/src/keybindings.ts,packages/contracts/src/settings.test.ts,packages/contracts/src/settings.ts

## Capture Provenance

- **capture_mode**: `staged-index`
- **pathspecs**: apps/web/src/attentionNotificationPolicy.test.ts, apps/web/src/attentionNotificationPolicy.ts, apps/web/src/components/AppSidebarLayout.tsx, apps/web/src/components/CommandPalette.tsx, apps/web/src/components/ThreadNotificationCoordinator.badge.test.tsx, apps/web/src/components/ThreadNotificationCoordinator.canonical.test.tsx, apps/web/src/components/ThreadNotificationCoordinator.test.tsx, apps/web/src/components/ThreadNotificationCoordinator.tsx, apps/web/src/components/attention/AttentionInbox.tsx, apps/web/src/components/attention/AttentionSidebarItem.tsx, apps/web/src/components/attention/AttentionWorkspaceRetention.tsx, apps/web/src/components/attention/attentionInbox.logic.test.ts, apps/web/src/components/attention/attentionInbox.logic.ts, apps/web/src/components/attention/useOpenAttentionInbox.ts, apps/web/src/components/settings/NotificationSettings.tsx, apps/web/src/components/settings/SettingsPanels.tsx, apps/web/src/components/settings/settingsSearch.ts, apps/web/src/components/sidebar/SidebarChrome.tsx, apps/web/src/routeTree.gen.ts, apps/web/src/routes/_chat.attention.tsx, apps/web/src/threadNotifications.ts, docs/internals/attention-notifications.md, docs/internals/overview.md, docs/user/attention.md, docs/user/keybindings.md, docs/user/notifications.md, docs/user/thread-sidebar.md, packages/contracts/src/keybindings.ts, packages/contracts/src/settings.test.ts, packages/contracts/src/settings.ts
- **claim_ids**: (none)
- **base_commit**: `c964ad3328feb63da34425ae41aec7aca4dad096`
- **upper_commit**: `working-tree`
- **dirty_state**: 30 staged paths, 0 unrelated unstaged paths

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/attention-notifications/artifacts/post-apply.patch
```

