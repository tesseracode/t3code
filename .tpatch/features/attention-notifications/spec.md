# Specification: attention-notifications

## Consolidated client-attention scope

The maintainer approved consolidating ATT-05 and ATT-06 after the old inbox
root's historical parent anchor became unverifiable with updated Foundation.
This root supersedes attention-inbox without deleting its artifacts or history.
Foundation remains the hard parent; shared eligibility stays in that root.

- Preserve the complete /attention inbox and persistent actionable-thread badge.
  Reuse one workspace instance, current/legacy/Settings sidebar entry points,
  command palette, configurable attention.open, and existing scoped thread routes.
- Preserve environment/project/kind/severity filters, stable oldest-first
  ordering, bounded LegendList rendering, keyboard selection and mounted
  active-descendant accessibility. Do not hydrate thread details for the inbox.
- Preserve explicit partial/stale/unsupported/unauthorized and empty states.
  Seen/unseen stays client-local, revision-based, reversible and capped at 2000.
  Cold catalog discovery must not erase persisted marks; seen never resolves
  attention or changes actionable counts.
- Preserve ATT-05 behavior and regression coverage. Notification badge
  semantics and canonical inbox count remain separate.
- Replay the complete consolidated canonical intent on the genuine updated
  parent baseline and verify product-tree equality before landing/supersession.

## Notification policy

- Default system/sound and in-app modes remain off until per-client consent.
  Existing opted-in clients retain approval/input/failure/completion categories.
  Disconnect starts disabled; all five categories are configurable.
- Persist categories, muted environment IDs and quiet hours only in existing
  ClientSettings. No account sync or server-host delivery.
- Quiet hours use local wall clock, start inclusive/end exclusive, midnight
  crossing supported, equal endpoints quiet all day. Suppressed events are
  consumed, not queued for later delivery.
- Active focused thread suppresses every channel, including sound. Other focused
  threads may toast/sound; background clients may use system alerts/sound.
- Canonical accepted live changes deduplicate by scoped item/revision/category.
  Initial snapshots, replay, import and rebuild do not notify. Completion emits
  once per newly completed turn, never once per replayed summary.
- Existing shell-based detection is exclusive fallback for explicit lack of
  canonical capability, never parallel detection.
- Reuse the existing renderer Notification, sound, toast and badge delivery.
  Notification badge remains pending-notification threads cleared on focus,
  distinct from canonical actionable count. Independent clients may each notify.
- System payloads are static category text with opaque scoped routing tags.
  No prompt/title/tool/error data. No second native emitter or mandatory relay.
- Browser permission requested only in Settings user gesture. Unsupported,
  denied and runtime delivery failures are visible, bounded and nonfatal.
- Clicks focus and navigate scoped threads; unavailable destinations display an
  explicit message. Removed environments route to inbox, never another machine.
- Focused tests cover defaults, policy boundaries, coalesced live/replay,
  duplicates/material revisions, multiple clients, errors and click routing.
  Maintainer approved isolated browser verification with notification stubs.
