# v0.1.4 attention replay: post-landing per-file source review

- Landing: `fe1c5d9a11c206c5aab6171edec002810b63c4dd`; actual base: `4de99f4a515055662ccd5d59f6f705b2ff973bd4`.
- Parent: Foundation `c36a114404f0dcd90e0ec39d410d1043d12547b1`, fully inspected and its audit committed as `4de99f4a515055662ccd5d59f6f705b2ff973bd4` BEFORE starting this child.
- Authoritative source: `964529c024c2d79944cc7219590bcad38aa40a1d`; original input patch SHA-256 `93dc0cb5694033539a6cdd0019615ccbfc4d40518b96042d04b0271e78f18630`.
- Recorded patch SHA-256: `6feb99da51a9427557a215cfcfcde7a8b8f7de07489c01d724556f2876e860d1`.
- Recipe SHA-256: `8d9797d8e72e39081b7a66612c42f8813f13cd09f93a72317349ec2678153c52`.

## Coverage and actual reconciliation

All 28 canonical product paths materialized; no omission or silent upstream-absorption claim. One tightly coupled audio-test fixture adaptation yields 29 paths. Actual source/diff inspected for every path after replay; post-landing Git blobs rechecked against reviewed source hashes. Existing long entrypoints were inspected at changed seams; additions, coordinator, browser helpers and behavioral assertions read directly.

`tpatch reconcile attention-notifications --upstream-ref v0.1.4 --format json` exited 1 before reconciliation: hard Foundation parent snapshot24 vs `pg_d4e3aa889560`. Exact refusal preserved in `v014-reconcile-refusal.txt`; verbose status/next outputs retained locally. `apply --mode started` succeeded and `--mode done` genuinely bound the actual new Foundation target, not historical `19785c67...`. No unchanged parent refreshed or fabricated parent snapshot/generation manifest.

Authoritative three-way application exited 1 with exactly four actual conflicts: AppSidebarLayout (removed LegacySidebar adjacency), ThreadNotificationCoordinator.badge.browser.test (new linked-subagent mock atoms versus attention atom), ThreadNotificationCoordinator (old direct click handling versus scoped retry/error handling), and threadNotifications (silent badge catch versus visible failure). Resolutions keep BOTH v014 and canonical behavior: imperative coordinator, shared linked-subagent/delegated subscriptions and new-only sidebar, while adding canonical policy. No old hook, Codex-specific registry or legacy sidebar APIs returned.

Thirteen paths match canonical source bytes exactly; remaining paths preserve upstream changes or documented v014 adaptations. Effect explanations use current no-unreasoned-state-sync rule. React Compiler/build setup and existing disposable browser-test helpers remain unchanged. The existing audio test fixture now reports ok=true because the replay's HTTP error check requires a successful Response, avoiding a coupled false-negative test.

Completion candidates are joined by owning V2 run to upstream grace in either arrival order; continuation cancels. Guest and usage-limit shell alerts remain, canonical failure and raw limit share one run episode while later material revisions may notify. Static OS payloads never include thread title; focused active thread suppresses sound/toast/OS. Clicks revalidate environment state and keep a scoped persistent retry when disconnected. Pending-notification badge and actionable inbox count remain separate. Seen/unseen state is client-local, bounded and reversible. No mobile push, relay authority, native emitter or permission behavior added.

## Structural evidence and remaining gates

See `v014-exact-replay-proof.json` for actual executed independent-root and sequential combined Git-index replay commands/results. Both reproduce landed product directory trees exactly from the real baselines; recipe contents and baseline preimages also match. It is not behavioral execution or a substitute for deferred platform checks.

`tpatch record attention-notifications --staged` exited 0: 119239 bytes, 29 files, naturally appended patches/004-record.patch and generation pg_cdc775771922 with actual Foundation generation26 dependency. Complete manual recipe has 29 current-source operations and actual-base preimages; explicit provenance is a manual attestation, not provider output. Internal exact proof: patch equals full HEAD-to-index binary diff, each recipe content equals landed source, every preimage equals actual baseline, all canonical paths covered and reverse-apply check succeeds.

`tpatch verify attention-notifications` exited 2: V7 aborts on ambiguous Native landing evidence; V8/V10 skipped. Both roots retain failed verifier status and exact output. No passing structural result or broad policy/platform waiver claimed. Historical v013 test-output/failed reconciliation history remain historical evidence, not v014 execution.

No tests/typechecks/builds/provider turns/dev servers/browser/simulator/platform qualification were executed: maintainer requires all roots integrated first. No dependencies installed or unrelated formatter/tooling introduced. No PR/push/release/tag/live upgrade. Runtime/visual/reviewer and Windows/Linux/WSL gates remain open, not waived.

## Per-file review and byte hashes

Actual-base / landed SHA-256 below (`absent` means new). Canonical-exact compares complete source bytes; v014-reconciled preserves upstream baseline rather than replacing it with an old full file.

- `apps/web/src/attentionNotificationPolicy.test.ts` — **canonical exact**. Local-time overnight/daytime/equal endpoint boundaries, categories, mutes and independent-client material revision assertions retained; not executed.
  - base `absent`; landed `bbf747059cf11ff70657823035c6f89bba217742cf980b478903d37020f1229a`.
- `apps/web/src/attentionNotificationPolicy.ts` — **canonical exact**. Pure category/mute/quiet-hour eligibility, scoped material revisions and silent consumption of suppressed candidates.
  - base `absent`; landed `ff0048cab274dbbd0a44daffc329389f9c22ed36efff65fe3bd31e0443105daf`.
- `apps/web/src/components/AppSidebarLayout.tsx` — **v014 reconciled**. Actual conflict: mount retention beside announcer; preserve v014 new-only Sidebar, never restore LegacySidebar.
  - base `12acb27741e23573c8cfac4e80c100d2223f7469745d60147fcfbb0ebee4594c`; landed `647be0336aef4f1d80539cf30e09a82cb259454d1078f5e6a8f9417ffe53dbfc`.
- `apps/web/src/components/CommandPalette.tsx` — **v014 reconciled**. One attention action with optional shortcut command, existing navigation/action entries preserved.
  - base `9519c28f3e587f26ec2740a864c0515d285682ca4ad4fae3b4231b09a55f9abc`; landed `4eb7833784dcca445f0417eb43faedb50eb5207fc9952494c6b70e7b83193c97`.
- `apps/web/src/components/ThreadNotificationCoordinator.badge.browser.test.ts` — **v014 reconciled**. Actual conflict: retain upstream noRequests/noDelegated atoms and AsyncDisposableStack/stubGlobal/fakeTimers helpers, add canonical state. Retains grace arrival-order, continuation cancellation, failure/limited episode, guest, click retry and active-thread silence assertions.
  - base `7ca206257ab5d6152878f0ea2cac2435244b5cedce59edc4daf202e8b0576d92`; landed `80297a80040ed98d2c879de7a5aee192bf6f507bd8c4ce634aae7c0f04ad428c`.
- `apps/web/src/components/ThreadNotificationCoordinator.tsx` — **v014 reconciled**. Actual conflict: preserve imperative startThreadNotifications(registry, router), v014 shared pending linked-subagent/delegated subscriptions and isShownUnderParent. Add canonical eligibility joined to unchanged upstream grace, per-run failure/limit episode dedupe, static payloads, active-thread every-channel silence, delivery errors and scoped click revalidation/retry.
  - base `99a49a1dceb589ad82dd6cb60a141539f7d4f111ca3bb5aca6a869b1249f7ee6`; landed `976444aa3f27d76cebd8dd8863ac6cd96b8e9e48fa0d3ca7298ea31f2ddd66c6`.
- `apps/web/src/components/attention/AttentionInbox.tsx` — **v014 reconciled**. LegendList bounded mounting, environment/project/kind/severity filters, stale/partial states, shell-only title lookup, keyboard selection and mounted aria-activedescendant; current effect-explanation rule applied.
  - base `absent`; landed `f6838707277ccb161a934f53f16b382362f5d071257cd6edcf55202243b73965`.
- `apps/web/src/components/attention/AttentionSidebarItem.tsx` — **canonical exact**. Shared actionable-thread badge distinct from pending-notification badge; scoped inbox navigation and mobile-web sidebar close.
  - base `absent`; landed `2ec11928221e4151ac4860bdb8d5e64f6c9b3e6efe5cfcf8e255d9ed028b1d58`.
- `apps/web/src/components/attention/AttentionWorkspaceRetention.tsx` — **v014 reconciled**. One shared workspace consumer, bounded local seen revisions and optional attention.open registration. Cold catalog does not erase persisted marks; current effect-explanation rule applied.
  - base `absent`; landed `fc42e0187d3f5b62b4121bd9d9c31633c1471ede688eca04b79faa2debea6198`.
- `apps/web/src/components/attention/attentionInbox.logic.test.ts` — **canonical exact**. Retains 5000-row scoped identity/filter/routing, incomplete counts, reversible seen revisions/cap/pruning, keyboard and no-default-shortcut assertions.
  - base `absent`; landed `dec029f609fbeb75543d77cc1b20250b491a92c7cb509a681cc82dcd022b9ffb`.
- `apps/web/src/components/attention/attentionInbox.logic.ts` — **canonical exact**. Local seen revision cap 2000, authoritative-only pruning, scoped filters/routing and distinct thread badge counts; seen never resolves canonical attention.
  - base `absent`; landed `e7f98440f860d418aaf15aac387066f21f676ec5c4979fb576824a52c1c760f8`.
- `apps/web/src/components/attention/useOpenAttentionInbox.ts` — **canonical exact**. Shared route target and explicit unavailable navigation feedback.
  - base `absent`; landed `006d93330f9860f34c2dad1813a28d6e458412e63147df4b0effbf741617a522`.
- `apps/web/src/components/settings/NotificationSettings.tsx` — **canonical exact**. Per-client opt-in and user-gesture-only permission request; five categories, reversible environment mutes and local quiet hours; no native permission/emitter change.
  - base `195bd8158d10b9e1bb0da3d08ea3a417f9b74e306ad266858e5000bc2c7b5c2a`; landed `e63ef01d4ba1ce861b0f0b86649cef33d6edb426d267760755d15600a7688c79`.
- `apps/web/src/components/settings/SettingsPanels.tsx` — **v014 reconciled**. Existing in-app consent switch retained with accurate cross-channel policy explanation.
  - base `a9116ff45f91a771c911cdc75cb30d2133c97d5c170c5c0ca62010c3344e3afe`; landed `13b5ad319c83ad88f63a06bda4344b6768f551b51f4cb00f22f261dbcd439b65`.
- `apps/web/src/components/settings/settingsSearch.ts` — **v014 reconciled**. Three additive notification policy search entries; Foundation TWS and upstream search entries retained.
  - base `d17c61a3c2aa3d05938cb5eac62a5796d3ea7bdf89c0108f772cce5683cd9615`; landed `f9ea87d29a493a32a8cc15af1951a95f49a9dbd9792088eedb7fce63adeeb4e2`.
- `apps/web/src/components/sidebar/SidebarChrome.tsx` — **v014 reconciled**. Add attention utility item to existing new-only chrome; Settings remains an upstream modal over that shell, with no legacy UI resurrection.
  - base `9aae972b20b12fd91b3f7501c654c11e4888cb5e27ba5be3eba958eed2d7b5e9`; landed `11ccee355252b10c2daaccbc1f4c177927497cfecc31227f00d5eeaa12d95976`.
- `apps/web/src/routeTree.gen.ts` — **canonical exact**. Only attention route/import/type/children additions; all upstream routes and generated-file conventions preserved.
  - base `c8461d692c18c547504f78364fb03fe138844e7dbf83a0a57706536552002700`; landed `2bb6dddc5171f292516e79c5bbc370ad7c6de666dd5b7ab12d089a386397bc5e`.
- `apps/web/src/routes/_chat.attention.tsx` — **canonical exact**. Minimal chat-shell attention route reuses existing authentication/routing.
  - base `absent`; landed `21635182efef544041da3a69057d8ddc5abe16616a8635c7be17c4980b008343`.
- `apps/web/src/threadNotifications.test.ts` — **v014 reconciled**. Coupled upstream fixture adaptation adds Response.ok=true for the canonical HTTP failure check; all existing coalescing/post-decode consent cases preserved, not executed.
  - base `c8461405d14da67b2883efb05e222710a28b3a2a3d27833a1ea53e52f6767b6c`; landed `97be80ce84d223ee27131a88e0edf2fcd1a27d0b0618cae2683cf2600ddc5cd6`.
- `apps/web/src/threadNotifications.ts` — **v014 reconciled**. Actual conflict: retain renderer audio/favicon/badge implementation and coalescing; add bounded delivery issue state, permission availability and explicit HTTP/audio/badge errors, not a native emitter.
  - base `c1c5d0f1768c71100235717dfc67300366d26c8b2fd5d83a54c105de61a831b3`; landed `d9a10ec6a8996d97f46330774fd74d8e9f8bafb6946aef3224986f7d54d55a56`.
- `docs/internals/attention-notifications.md` — **canonical exact**. Documents single renderer emitter, post-live eligibility, grace/failure episodes, default-free patch schemas and retry routing.
  - base `absent`; landed `1dedd4aaf0dae7b70efc54ad5f0bb0605efdf2e7ec9676748f7c9440b06450a4`.
- `docs/internals/overview.md` — **v014 reconciled**. Small ownership constraint section only; existing upstream V2/peer-link architecture retained.
  - base `430e4b4d3ead46341043cdde849506df684e14695e8f317201799ec1af0912e3`; landed `a1bc16767a627177e7fb9f30c01a3eec75112e7acab962d7a1aefe227f9783fb`.
- `docs/user/attention.md` — **canonical exact**. User-facing inbox/count/filter/seen/unseen/stale semantics and optional shortcut without platform claims.
  - base `absent`; landed `b031702348e1aa9f28a6d47e9d2aade1e6b6ef68a573a69d708d0ad780e55595`.
- `docs/user/keybindings.md` — **v014 reconciled**. Document optional attention.open command and inbox keyboard controls.
  - base `1575a37dc521cb18073fde180ce1072fa51f5e24084aa77361b28415257206af`; landed `ff9300045ed8e8615d108af477ebe07fd31b14387ab597e3a111c803570357d6`.
- `docs/user/notifications.md` — **canonical exact**. Client-only opt-in/privacy/categories/mutes/quiet-hours and explicit offline retry; no server/mobile push promise.
  - base `absent`; landed `802cbe98f23c9bdd3a6f98e054893f422a022f7eafa0821eef1ed9d4b19be446`.
- `docs/user/thread-sidebar.md` — **v014 reconciled**. Document scoped actionable badge separate from desktop pending notifications.
  - base `b1fe4e0b18009997ac40555e262ca4427745ef81b3f0ece8c28fac7234c4cf5d`; landed `d11077bf2fe8a2111ceb2efb53ee8252f1c324230bc9d9a99896101ee58729e1`.
- `packages/contracts/src/keybindings.ts` — **v014 reconciled**. Add attention.open to static command contract only; no default binding or provider API change.
  - base `d9bbde256378b9e83ce3168b3241ec7da3af62ebe533577766f8f9f2d8af84f9`; landed `b39fbfd3ac3ece176572034c88fcd2b9f16bab7dc56d0ca96f0cbe51e947836a`.
- `packages/contracts/src/settings.test.ts` — **canonical exact**. Focused existing-file cases prove empty/unrelated patches cannot reset policy; quiet-hour bounds and roundtrip, execution deferred.
  - base `d28d0f1f821c3a596da477cd4c107dc7f529e381f5834cd1661e3a57ab95e958`; landed `a38294ba97d7d042dd3947370250f844f5cec9d12a368b01de9204253c068050`.
- `packages/contracts/src/settings.ts` — **v014 reconciled**. Storage defaults preserve opt-in off/disconnect off. ClientSettingsPatch uses raw optional schemas WITHOUT defaults; Foundation TWS and all upstream settings retained.
  - base `8e9d033882e608b3d67ef0c45d91766060e5ebb28c22ec1398c9558b1dc69e50`; landed `304f77a7b9d3f23bd638dd4032d033a29aa18c0e41ca88ab48e21087049e1922`.

## Later smallest selectors (prepared, NOT RUN)

```sh
vp test run apps/web/src/attentionNotificationPolicy.test.ts apps/web/src/components/attention/attentionInbox.logic.test.ts apps/web/src/components/ThreadNotificationCoordinator.logic.test.ts apps/web/src/threadNotifications.test.ts packages/contracts/src/settings.test.ts
vp test run apps/web/src/components/ThreadNotificationCoordinator.badge.browser.test.ts
```

Also run Foundation's prepared selectors from its sibling audit, affected-package `vp run typecheck`, scoped format/lint and route/compiler checks in the integrated target, never repo-wide checks. One integrated real web/desktop pass should cover Settings/palette/optional binding, large virtual inbox, seen reversal, multi-environment stale/reconnect, static Notification stubs, both completion arrival orders/continuation, failure/limit dedupe and retry after reauthorization. Mobile only inherits shared state/contracts; no mobile-push validation claim. User-approved later reviewer/visual pass must distinguish source proof from runtime qualification.

## Generated lifecycle metadata inspection

Inspected actual apply-session/manual-validation needs_review, actual-base status and failed verify hashes, staged-index record provenance, complete recipe/preimages, natural generation/dependency capture and canonical/audit patch equality. CLI record appends one generation and clears only the previous generation's moving canonical_patch alias; all previous generation payloads and audit patches remain. No hand-authored generation manifest. post-apply-diff.txt and record.md Change Summary are the installed apply-done unstaged-only summary (metadata, not product); they are preserved, NOT represented as complete source capture. The authoritative post-apply.patch, staged-index file count and exact byte proof are complete.

- `.tpatch/features/attention-notifications/artifacts/apply-recipe.json` — landed SHA-256 `8d9797d8e72e39081b7a66612c42f8813f13cd09f93a72317349ec2678153c52`.
- `.tpatch/features/attention-notifications/artifacts/apply-session.json` — landed SHA-256 `e293acdeacb6a9f6d95dedb8691ef518fa1be67a41f0d6f05e25d391732d3c45`.
- `.tpatch/features/attention-notifications/artifacts/manual-validation.md` — landed SHA-256 `16a221e8812a4d258a9200f3e6350359c8902df67995677cf1aaee403743adb3`.
- `.tpatch/features/attention-notifications/artifacts/patch-generations.json` — landed SHA-256 `ef0ed4186b3b23db53716bd6393583fd481f7dfddd9582ecd779780f09a18d0b`.
- `.tpatch/features/attention-notifications/artifacts/post-apply-diff.txt` — landed SHA-256 `d154d38296a2d3fa5f6361a2f08540230024ac26b93d74fda83498ecc7192b85`.
- `.tpatch/features/attention-notifications/artifacts/post-apply.patch` — landed SHA-256 `6feb99da51a9427557a215cfcfcde7a8b8f7de07489c01d724556f2876e860d1`.
- `.tpatch/features/attention-notifications/artifacts/v014-recipe-provenance.json` — landed SHA-256 `da21bcfce8f262e676bec4947cf1eb82f68559d8ee41c53189b606a5c93dc438`.
- `.tpatch/features/attention-notifications/artifacts/v014-reconcile-refusal.txt` — landed SHA-256 `eebddf4598ff77bd1e3066a65107ff9d0ff2433b800d6bdfd69f5f09c6ade827`.
- `.tpatch/features/attention-notifications/patches/004-record.patch` — landed SHA-256 `6feb99da51a9427557a215cfcfcde7a8b8f7de07489c01d724556f2876e860d1`.
- `.tpatch/features/attention-notifications/record.md` — landed SHA-256 `1a1f6c3cc7e4d7be53cf0fd1b5bfee3b2bd9d8861c38237f219ed1f00283ce42`.
- `.tpatch/features/attention-notifications/status.json` — landed SHA-256 `c737da02a2855b0cc844a5b08573a39fad8ac04fa5fd7b0992a01290956f0f22`.
