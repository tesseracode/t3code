# Specification: attention-inbox

- One /attention page and sidebar badge for web local/hosted and desktop.
  Mobile UI belongs to #15, notifications to #8.
- Reuse the shared Foundation workspace, scoped references and count semantics.
  Display live/stale counts, incomplete totals, unavailable environments and
  honest empty states. Counts represent threads; rows represent items.
- Environment, scoped project, kind and priority filters preserve authority,
  sorting and keyboard selection. Large lists are virtualized; no thread detail
  is loaded until navigation.
- Rows navigate to existing scoped threads for approval/input responses.
  Stale rows stay navigable but explicitly require reconnection before action.
  No synthetic resolve or duplicate request-response UI.
- Current/legacy sidebar, Settings and command palette use the same navigation
  action. The registered attention.open command has no default shortcut.
- Seen/unseen is local revision-based emphasis. Opening marks seen; marking
  unseen reverses it. New revisions become unseen, and canonical counts stay
  unchanged. Keep at most 2000 most recent marks and prune only using complete
  authoritative environment snapshots or removal/authorization loss.
- Use existing errors/toasts, styling and virtualization. No continuously
  animating badge/spinner or OS badge changes.
- Focused tests cover scope/routing, filters/counts, stale/empty states,
  seen-state reversibility/retention, keyboard selection and large lists.
  The maintainer approved one isolated browser pass with synthetic fixtures.
- Record and land this root separately; preserve the complete Foundation root.
