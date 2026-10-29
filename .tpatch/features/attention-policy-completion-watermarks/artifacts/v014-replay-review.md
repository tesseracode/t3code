# v014 attention policy completion-watermark audit

Actual base: `ee5c462a9d408f38ac2c7495ec91dfcc617b1ac1`. Four complete product paths, four actual-base preimage-bearing recipe operations. Full original Foundation/attention canonical artifacts and compatibility canonical are byte-unchanged.

## Confirmed finding and proof

Independent reviewer finding acknowledged as REAL: policy changes cleared handled/skipped completion watermarks while keeping prior thread snapshots. Unsupported legacy environments could replay an old completion after opt-in or duplicate a handled completion after category/mute edits. Fixed by consuming policy-pending completions without forgetting history, not by disabling fallback.

The new browser tests directly start the actual imperative coordinator with explicit unsupported attention state and Notification stubs. The first runner attempt could not execute because its pinned headless Chromium was missing; that infrastructure failure is preserved separately and is NOT the red regression. Installed only the missing headless test browser after that failure, under ignored project-local cache, with TMPDIR inside this worktree.

Using Node 26.12.1 and project-local PLAYWRIGHT_BROWSERS_PATH/TMPDIR:

- `vp test run apps/web/src/components/ThreadNotificationCoordinator.badge.browser.test.ts -t "does not replay a fallback completion"` BEFORE production edits: exit1, 4 actual assertion failures (expected 0 got 1, expected 1 got 2); 14 other cases filtered out.
- SAME command AFTER production edits: exit0, 4 passed; 14 other cases filtered out.
- `vp test run apps/web/src/components/ThreadNotificationCoordinator.badge.browser.test.ts apps/web/src/components/ThreadNotificationCoordinator.logic.test.ts apps/web/src/attentionNotificationPolicy.test.ts`: exit0, 3 files / 39 tests passed, including all 18 actual-coordinator cases.
- `vp run --filter @t3tools/web typecheck`: exit0.
- `vp fmt --check` on the three touched TypeScript paths plus docs/internals/attention-notifications.md: exit0.
- `vp lint --report-unused-disable-directives` on the three touched TypeScript paths: exit0.
- `tpatch verify attention-policy-completion-watermarks`: exit2, inherited ambiguous Native landing evidence; no blanket waiver. Independent cached Git patch replay succeeds from the real base.

Actual transcripts are preserved in v014-validation-transcript.txt and v014-structural-verify.txt. No app/dev server, provider turn, simulator or repo-wide helper started. Only isolated existing headless browser unit runner used; no real OS notifications or permission changes.

## Lifecycle / source accounting

`add → analyze --manual → define --manual → explore --manual → implement --manual → apply --mode started → regression-before/fix/after → apply --mode done → record --staged` captured all four paths before commit. Patch is 4301 bytes, SHA256 c93803f59c055124c2c58954dea3b2a92891d891a7e12e65c5c235cdf40b1369; recipe SHA256 751a98b9b03c47a5b8a404a06025ce14663c4fdb3c91f30eb81f767067c3e0bd. It does not replace the complete parent canonical with a small delta.

## Per-file source inspection and hashes

- `apps/web/src/components/ThreadNotificationCoordinator.logic.ts` — New policy-only consumePendingCompletions advances each queued timestamp through existing monotonic skip, cancels timers, preserves handled/skipped and lastSettled maps. Existing full clear for snapshot/session teardown is unchanged.
  - base `605fcf1d1eba951e4ac9327c14aa21de901653c67f4a4a3d4d38c36d6928d43b`; current `d9e4e98ec275e15a306c93c4e7e92118a85d47c19135135f082c7b530a8b559d`.
- `apps/web/src/components/ThreadNotificationCoordinator.tsx` — Only policy-change gate operation changes; canonical pending candidates still clear. Imperative coordinator, grace joining, guest/limited alerts, dedupe, click retry and delivery policy retained.
  - base `976444aa3f27d76cebd8dd8863ac6cd96b8e9e48fa0d3ca7298ea31f2ddd66c6`; current `ccb51723bf79215c69cee42e840a8ffdd6100235f1b3e9ed5955fdfb79f00b2a`.
- `apps/web/src/components/ThreadNotificationCoordinator.badge.browser.test.ts` — Four actual-coordinator unsupported-server regressions: opt-in before/after grace, category edit and unrelated environment mute edit, then rename same completed thread. Existing disposable helpers and all prior cases retained.
  - base `80297a80040ed98d2c879de7a5aee192bf6f507bd8c4ce634aae7c0f04ad428c`; current `12fc563fa4551c008598eabadfe8865fa1385057774593b82c8b4e578be64a55`.
- `docs/internals/attention-notifications.md` — Document fallback policy watermark lifetime; no grouping, server authority, native emitter or mobile-push claim.
  - base `1dedd4aaf0dae7b70efc54ad5f0bb0605efdf2e7ec9676748f7c9440b06450a4`; current `907385eb1893b9bee2a378d0397349b19d77c69ff1465cb0e7926905db269f1b`.

## Later integrated gates / grouping boundary

Primary will rerun the integrated helper after merging both cohesive fix roots; the independent reviewer will recheck. No reviewer result or platform qualification is invented here. Workspace/repository grouping and tag inference remain separate assessment work; this renderer watermark fix introduces none.
