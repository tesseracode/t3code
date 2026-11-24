# Canonical frontend notifications

This maintenance root now consolidates the full ATT-05 inbox with ATT-06
notification policy, as explicitly approved by the maintainer. The original
inbox root remains historical and is superseded, not regenerated to hide the
tpatch dual-anchor limitation.

ATT-06 (#8) extends the existing ThreadNotificationCoordinator and settings;
it does not introduce a native emitter, server sink or notification authority.
The approved client policy preserves existing opt-in modes and the approval,
input, failure and completion categories. New disconnect alerts start disabled.

Canonical eligibility must survive React batching: comparing rendered snapshots
alone can confuse a coalesced bootstrap with a live transition. Keep a derived
current-candidate map at the shared stream boundary, populated only by accepted
post-live notification-eligible deltas and cleared on bootstrap/replay/reset.
It is bounded by current items/summaries, not an event queue.

Use canonical state when supported; retain upstream shell transitions only for
explicitly unsupported environments. Completion is optional summary awareness,
not a newly opened attention item. Default OS payloads contain static text only.
