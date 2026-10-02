# Frontend notification policy

`ThreadNotificationCoordinator` remains the sole web/desktop renderer emitter.
Electron keeps the existing renderer Notification path and native badge IPC;
there is no server-only notification sink, mobile/relay dependency or user-wide
lease.

The existing shared attention consumer projects a current eligible-candidate
map from accepted post-live deltas. This metadata is absent from wire contracts
and is bounded by current compact items/summaries, not an event backlog.
Bootstrap, replay fences, reset and nonlive states clear eligibility. Resolution
and deletion remove candidates; same-turn completed-summary revisions do not
manufacture new completions. Keeping independent candidates until they cease
to be relevant makes consumer batching safe.

The coordinator consumes candidates even while channels, categories or
environments are muted. Revision/category observations are client-local and
never feed back into canonical state. Completion is a newly completed non-null
turn, not an open item. Explicitly unsupported environments use the existing
shell transition detector exclusively; unknown or failed canonical sync does
not activate fallback.

`ClientSettingsSchema` stores category choices, muted environment IDs and local
quiet hours alongside the existing opt-in modes. Patch codecs use the raw field
schemas without decoding defaults, so unrelated preference updates cannot
silently reset notification policy. Quiet hours are checked at delivery and
again after asynchronous sound decoding; suppressed events are not queued.

Foreground active-thread suppression is scoped by environment/thread and
covers every channel. The existing toast/system-alert split and pending-thread
notification badge remain distinct from the actionable inbox. OS payloads use
static text and opaque scoped tags; clicks recheck current access/status.
Disconnected clicks retain their scoped destination in a persistent retry action
instead of attempting to fetch a lazy route while offline.
Permission and delivery failures surface through the existing Settings area
and bounded diagnostics without disabling attention state.
