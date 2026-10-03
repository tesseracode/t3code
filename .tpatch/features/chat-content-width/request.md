# Feature Request: Add a client-local Standard, Wide or Full width preference for aligned conversation and composer layout.

**Slug**: `chat-content-width`
**Created**: 2026-10-03T06:03:34Z

## Description

Let users on large displays widen the conversation and composer independently
of changing text size, while keeping today's centered layout as the default.

## Status and baseline

Requested only, not implemented. Branch `request/chat-content-width` starts
independently from shipped source `bc9eeb9a6f5e3fe2e6d58d9c1b14d5ed93d6c2be`.
Canonical backlog: #1. This does not implement #18's narrow-window send shortcuts
or the separate Windows title-bar/menu request.

## Existing behavior and prior art

Messages and composer use `max-w-3xl`, whose current Tailwind value is 48rem.
At the default 16px interface size this is approximately 768 CSS pixels. They
fill smaller available panes but stop widening on large displays.

- `apps/web/src/components/chat/MessagesTimeline.tsx:1100` caps the timeline;
  additional timeline status/row wrappers also use max-w-3xl.
- `apps/web/src/components/ChatView.tsx:9568`,
  `apps/web/src/components/chat/ChatComposer.tsx:5963` and
  `apps/web/src/components/chat/ComposerSurface.tsx:16` constrain the composer.
- `apps/web/src/appearanceFonts.ts:89-119` sets the root interface font size,
  which scales rem dimensions. Prompt/code font sizes are separate pixel values.
- Current client settings expose no chat-column-width preference.

## Proposed outcome

- A client-local Appearance preference with Standard / Wide / Full width modes.
  Standard preserves the current 48rem behavior and remains the default.
  Determine the Wide maximum through responsive layout evaluation rather than
  inventing an arbitrary numeric slider or changing font-size preferences.
- Full width follows the available chat pane, not the entire desktop/window;
  preserve safe gutters when sidebar, terminal or right panel is open.
- Keep user/assistant messages, composer, approval/input/plan panels and relevant
  work/status rows aligned. Audit nested maximum widths rather than fixing only
  the outer wrapper.
- Preserve wrapping, horizontal scrolling for intrinsically wide code/tables,
  image bounds, virtualized timeline measurement and scroll anchoring.
- Cover existing threads, fresh drafts, first-project layouts, search results,
  large text, browser zoom, narrow windows, split panes and light/dark themes.
- Persist per browser/device, not as execution-environment or provider state.
  Include Settings search, reset to default and compatibility with old settings.
  Do not make provider or network changes for a layout preference.
- Web and Electron desktop share the main implementation. Decide native
  mobile/tablet applicability explicitly; do not force phone layouts wider or
  assume the React web setting automatically changes React Native.
- Avoid width animations, per-row resize polling or repeated full-history work.

## Boundaries

No runtime changes, tpatch phase advancement, browser/device automation,
packaging, CI, PR or release in this registration. User-visible verification
will require approval when implementation begins. Channel artwork and active
chat environment identity remain separate proposals.
