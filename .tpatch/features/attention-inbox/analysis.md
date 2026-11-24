# Attention inbox

ATT-05 (#7) exposes the existing Foundation aggregate, not another attention
authority or notification coordinator. The maintainer approved a separate UI
root, a dedicated /attention page, a persistent sidebar badge, and navigation
to existing thread approval/input controls.

Reuse the common SidebarUtilityMenu for current/legacy sidebars and Settings;
the command palette and optional attention.open binding share one navigation
action. No default shortcut is assigned. The ATT-04 workspace remains a single
shared instance mounted throughout the authenticated app layout.

Compact attention has no thread titles; use existing shell/project metadata
with scoped ID fallbacks, never detail subscriptions for the list. Use the
installed LegendList virtualizer, accessible selection/keyboard controls and
stable scoped keys. Device-local seen revisions retain at most 2000 recent
marks and never affect actionable counts or server resolution.
