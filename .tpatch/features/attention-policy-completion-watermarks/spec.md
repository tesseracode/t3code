# Specification: policy completion watermarks

Hard parent: `attention-notifications`.

## Complete cohesive scope

- `ThreadNotificationCoordinator.logic.ts`: expose a policy-only operation that
  cancels queued completions and marks them consumed, without erasing previously
  handled/skipped timestamps or last-settled observations.
- `ThreadNotificationCoordinator.tsx`: policy edits clear canonical pending
  completion candidates and use that consumption operation. Environment/session
  teardown retains the existing full `clear()` behavior.
- `ThreadNotificationCoordinator.badge.browser.test.ts`: drive the actual
  coordinator with unsupported canonical attention. Prove silence when enabling
  before or after grace, and no duplicates after category or mute edits, followed
  by a metadata update to the same completed run.
- `docs/internals/attention-notifications.md`: state the policy/fallback
  watermark invariant rather than claiming canonical-only replay protection.

## Acceptance and evidence

1. Run the new actual-coordinator regression before production changes and retain
   the real failure output.
2. After the fix, the focused regression and existing coordinator/gate/policy
   cases pass; owning web typecheck and scoped format/lint pass.
3. Grace still cancels a real continuation; new completions can notify, first
   snapshots and stopped/archived observations remain silent.
4. No default opt-in, permission, native emitter, mobile/relay authority,
   app/dev server or repo-wide helper change.
5. Before committing, record the entire four-path fix root with genuine baseline
   preimages and complete patch accounting. Do not replace the full parent
   canonical patch with a tiny fix.

## Grouping boundary

This fixes renderer notification observation lifetime, not repository/workspace
grouping, tag inference or server attention authority. Those remain separate
assessment work after integration and review.
