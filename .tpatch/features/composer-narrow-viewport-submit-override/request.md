# Feature request: Allow keyboard submission in narrow web windows

**Slug**: `composer-narrow-viewport-submit-override`
**Created**: 2026-10-01T18:32:57Z

## Description

Add an opt-in client setting that bypasses the web composer's narrow-viewport submission guard. Users with physical keyboards should be able to use normal send shortcuts in a narrow window without changing the default mobile newline behavior.

This is a request only, authored through tpatch Path B (agent-as-provider). Keep the lifecycle in `requested`; do not implement, generate an apply recipe, or advance phases as part of this registration.

## User problem and origin

On 2026-10-01, the requester reported that Enter inserted a newline in the web composer instead of submitting a prompt. Keyboard combinations did not provide an apparent way to submit, enqueue, or steer the draft, so they clicked the arrow-shaped send button.

The requester uses a laptop with a small screen and two apps side by side. The web window can therefore be narrow despite having a physical keyboard. This is not a mobile software-keyboard interaction.

Investigation found that `ChatComposer` derives `isMobileViewport` from `useMediaQuery("max-sm")`. The breakpoint helper maps this to a maximum width of 639 CSS pixels. `composerSubmissionIntentForEnter` returns `null` when that flag is true, before considering Ctrl/Cmd. Enter consequently falls through to the editor for newline insertion, and modifier combinations cannot bypass the guard.

Window width is a layout signal, not evidence of device type or keyboard type. This request addresses that mismatch with a user-controlled override rather than automatic detection.

## Why the existing behavior exists

The guard originated upstream, not in this fork:

- [Upstream issue #2478: New line on mobile browser just sends the message](https://github.com/pingdotgg/t3code/issues/2478) reported that an Android software keyboard could not create multiline prompts.
- [Upstream PR #3930: Fix mobile composer Enter behavior](https://github.com/pingdotgg/t3code/pull/3930), merged 2026-07-17 as `6a17629670f31a00719fb92c7c9413661cd6def5`, let plain Enter fall through to Lexical on mobile-width viewports. Desktop Enter submission and Shift+Enter newline insertion were preserved.
- [Upstream PR #7821: Cmd+Enter to create a thread in the background](https://github.com/pingdotgg/t3code/pull/7821), merged 2026-08-21 as `e0b4f4639037ce539e6feac7eaf11995cf5490f8`, added Ctrl/Cmd+Enter background draft submission while retaining the mobile guard.

The original rationale explicitly concerns mobile software keyboards. It does not discuss physical keyboards in narrow desktop windows. Preserve the mobile fix rather than removing the guard globally.

## Requested behavior

1. Add a discoverable, persisted client setting to allow keyboard submission regardless of web viewport width. Suggested wording: "Allow send shortcuts in narrow windows"; final naming belongs to the definition phase.
2. Default the override to off. Existing users, including mobile-web users, retain their current behavior unless they opt in.
3. When enabled, bypass only the viewport-width guard. Apply the same submission rules as a normal-width window, including Shift+Enter newline handling, draft background submission, and any configured send shortcut.
4. Keep send-versus-queue-versus-steer behavior governed by the existing follow-up setting and supported shortcuts. The override must not introduce a new submission intent or force steering.
5. Allow users to turn the setting off again and immediately restore narrow-width newline behavior without reloading or resizing.
6. Explain in the setting's help text that it is useful for physical keyboards and side-by-side windows, and that enabling it also permits keyboard submission in narrow mobile-web windows.

## Scope and upstream reconciliation

The feature concerns the web composer and the desktop client's shared web UI. Local hosting, remote connections, and tunnels should behave consistently. It does not request changes to the native mobile composer, provider adapters, or server turn semantics.

At investigation time on 2026-10-01, this checkout has no configurable send shortcut. Current upstream has a `sendShortcut` setting with `enter`, `mod-enter-multiline`, and `mod-enter` modes, but still gives the mobile-width guard precedence. Integrate the override with whichever shortcut model exists at implementation time; do not duplicate or replace upstream's send-shortcut setting.

Likely code touchpoints, to re-evaluate before implementation:

- `apps/web/src/components/chat/ChatComposer.tsx`: viewport flag, editor command handler, and settings integration.
- `apps/web/src/composer-logic.ts` and its tests: submission decision and narrow-width override.
- `apps/web/src/hooks/useMediaQuery.ts`: evidence for the existing width threshold; changing shared breakpoints is not requested.
- `packages/contracts/src/settings.ts` and web Settings: established client setting defaults, persistence, and discoverability.

## Acceptance expectations for later definition

- With the override off, narrow-width Enter and Ctrl/Cmd+Enter retain the existing newline behavior.
- With the override on, a physical-keyboard user can submit from the composer at 639 CSS pixels or less using the same keys as at normal width.
- Shift+Enter and any upstream shortcut-specific modifier rules remain consistent with normal-width behavior.
- Normal-width submission is unchanged whether the override is on or off.
- Sending while a turn runs respects the existing Queue/Steer preference and provider capabilities.
- Existing editor behavior, including input-method composition and autocomplete selection, is preserved.
- The preference survives reopening the client and can be reversed without changing viewport width.

## Deferred work

Automatic device-type or keyboard-type detection is a possible follow-up, not part of this request. Do not add user-agent sniffing, touch/pointer heuristics, or hardware-keyboard inference in this feature.

No application code changes, lifecycle advancement, commits, or pull requests are requested at this stage.
