# Thread notifications

Notifications belong to the client you are using, not to the environment hosting
your work. They are off by default. Running a server without an interactive
client does not show alerts or play sounds.

In **Settings → General → Behavior**, choose system notifications, sound, both,
or neither. The separate **In-app notifications** switch enables foreground
toasts. Browser permission is requested only when you choose a system-alert
mode. Denial or unavailable delivery is shown in Settings; the
[attention inbox](./attention.md) remains usable.

## Categories, mutes and quiet hours

Choose which categories may use your enabled channels: approvals, input,
failures, provider disconnections and completion. Existing choices retain
approval/input/failure/completion alerts; provider-disconnection alerts start
disabled. Completion is awareness, not an open attention item.

Mute individual environments without removing them from the inbox. Quiet hours
mute all channels using this client's local clock. The start is inclusive and
the end exclusive, including schedules crossing midnight. Equal start and end
times mean quiet all day. Events suppressed while disabled, muted or quiet are
not delivered later.

The focused active thread is silent on every channel. Other threads may show
opted-in toasts or play sound while the app is focused; background clients may
use system alerts and sound. These preferences do not synchronize across
clients. Two opted-in clients may each notify.

## Privacy and reliability

System notifications use static category text, not thread titles, prompts,
tool output or error details. Clicking focuses T3 Code and opens the owning
environment/thread. A disconnected destination retains a **Retry open thread**
action until you reconnect, rather than trying to load an unavailable route;
removed or unauthorized environments lead to the inbox.

Initial snapshots, history import, rebuilds and reconnect replay do not notify.
Live canonical items deduplicate by scoped identity and material revision.
Older servers explicitly lacking canonical attention use the existing
shell-based transition detector instead, never in parallel.

Notification badges count threads with pending notifications and clear on
focus. They remain separate from the inbox's actionable-thread count.
Disabling notifications, muting an environment or marking an inbox item seen
does not resolve attention.
