# V2 attention UI and notification reconciliation

This is the complete inbox/notification root, not a notification-only fixup.
It depends on Foundation's recorded V2 run-identity correction at `417097d382`.
The original blocked/stale-parent preflight and historical intent are retained.

## Adaptation

- Keep upstream's imperative `startThreadNotifications(registry, router)`,
  completion grace, compact Windows notification tags and persistent-click behavior.
- Join canonical completion eligibility to the owning run's settled shell state
  in either arrival order. An intervening continuation cancels completion.
- Preserve Guest alerts and Limited alerts, deduplicating the latter against
  canonical failures by owning run without hiding later material revisions.
- Keep static payloads, scoped focused-thread silence, client-local categories,
  mutes/quiet hours, no replay on opt-in, destination revalidation/retry,
  explicit delivery errors and a notification badge separate from inbox counts.
- Retain the virtualized inbox, local bounded/reversible seen emphasis, sidebar,
  command palette, optional keybinding, settings/search and scoped routes.
- Use the current React Compiler and UI component variants. Effects only own
  real external subscriptions, persisted retention or virtualized accessibility.
- Replace obsolete React-test-renderer harnesses with the upstream imperative
  browser harness. No new rendering dependency was installed.

## Executed focused gates

Node 26.12.1, repository-local tools, and an already-installed isolated Chromium
cache were used. These commands passed:

```sh
vp test run apps/web/src/attentionNotificationPolicy.test.ts \
  apps/web/src/components/attention/attentionInbox.logic.test.ts \
  apps/web/src/components/ThreadNotificationCoordinator.logic.test.ts \
  apps/web/src/components/ThreadNotificationCoordinator.badge.browser.test.ts
# 42 passed across four files.

vp test run packages/contracts/src/settings.test.ts -t 'notification policy' --project root
# 2 passed; 24 unrelated tests not selected.

tsc --noEmit -p apps/web/tsconfig.json
tsc --noEmit -p packages/contracts/tsconfig.json
# Both passed.
```

`vp lint` passed for all 21 changed TypeScript/TSX source files, excluding the
generated route tree. Targeted formatting passed. Early missing-browser and
obsolete-harness failures were resolved rather than counted as successful runs.

The integrated real-client visual/provider pass and independent reviewer remain
candidate gates. These focused results do not qualify native mobile, Windows,
WSL, Ubuntu, optional push delivery, or an actual operating-system notification
permission prompt.
