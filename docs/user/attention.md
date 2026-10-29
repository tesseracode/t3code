# Attention inbox

Open **Attention inbox** from the sidebar or command palette to see open approvals,
input requests, agent failures and provider disconnections across enabled
environments. The sidebar badge counts threads, while the inbox lists individual
items: two approvals in one thread count as one thread and two items.

Use Environment, Project, Kind and Severity to narrow the list. Blocking requests
and errors appear before warnings, oldest first within each group. In the list,
Up/Down and Home/End select an item; Enter opens its owning thread. Respond using
the thread's normal approval or input controls.

A `?` after the badge count means the total is incomplete. Disconnected
environments retain a visibly stale snapshot; their items might already be
resolved elsewhere. Reconnect before responding. Disabling or removing an
environment removes its cached attention from this client.

Opening an item marks that revision **Seen** on this device. **Mark unseen**
reverses the emphasis. A changed revision becomes unseen again. Seen items
remain in the inbox and actionable count until the environment resolves them;
seen history keeps up to 2,000 recent marks.

You can assign **Attention: Open** in Settings → Keybindings. No shortcut is
assigned by default. The inbox and its badge are separate from background
notification badges; opening the app or marking items seen does not resolve
attention or change notification preferences.

Configure categories, environment mutes and quiet hours in
[Thread notifications](./notifications.md).
