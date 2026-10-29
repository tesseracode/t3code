# Exploration: attention-inbox

The existing shared `attentionWorkspace` export is lazy. Mount its value once
in AppSidebarLayout, keeping a single subscription owner across navigation.
SidebarUtilityMenu is shared by current/legacy sidebars and Settings. Add a
compact inbox entry even when the existing utility menu shows Back.

Add a TanStack _chat.attention route under the existing authentication gate.
WorkspacePageHeader/SidebarInset supply desktop titlebar geometry. Existing
environment catalog labels and project/thread shell data enrich compact rows.
The existing thread route remains the only response UI.

CommandPalette actionItems is the current command registry. Add a shared open
hook/action there and in sidebar/keybinding dispatch. STATIC_KEYBINDING_COMMANDS
allows optional user configuration through existing Settings; do not add a
default shortcut or change provider/server request authority.

LegendList is already installed and supports scrollIndexIntoView. Use bounded
rendered rows and a listbox selection with toolbar actions. Local storage
helpers provide schema validation and cross-tab updates for seen revisions.
Do not reuse notification-badge clearing or server device-state acknowledgments.

Validate isolated synthetic data, including colliding local IDs, >1000 items,
stale connection retention and authorization loss. No live data or credentials
are copied. Browser use was approved explicitly.

The integrated pass found a real cold-catalog race in local seen cleanup:
registry discovery can initially publish an empty ready catalog. Only treat
an absent environment as removed after observing it during the current mount;
otherwise a reload erases persisted seen marks. Pure regression coverage and
the real reload flow cover this constraint.

The real 2402-item fixture rendered 14 attention rows and used exactly one
attention subscription; captured RPC traffic contained no thread-detail
subscription before navigation. Retain the shared sorted aggregate and use
direct item lookups for bounded seen cleanup rather than sorting again.
