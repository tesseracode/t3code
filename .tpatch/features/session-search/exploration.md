# Exploration: session-search on v0.0.42

## Current integration

- `packages/contracts/src/keybindings.ts` declares `chat.search`; the shared
  defaults bind `mod+f` outside terminal and preview focus.
- `routes/_chat.tsx` sends a scoped request and claims the shortcut only when a
  current timeline accepts it. `sessionSearchBus.ts` carries the scoped key.
- `CommandPalette.tsx` offers the same action and defers it until dialog close,
  suppressing the otherwise unconditional composer focus restoration.
- `sessionSearch.ts` preserves bounded NFKC/case-insensitive occurrence matching,
  deterministic wrapped navigation and IME-safe keyboard behavior.
- `MessagesTimeline.logic.ts` reuses the existing row projection to identify
  searchable activities. `revealedEntryId` temporarily unfolds only its containing
  turn and work group and participates in incremental projection invalidation.
- `MessagesTimeline.tsx` retains nested tool-list virtualization and targets the
  matching member of an expanded group. Only actual search navigation disables
  live follow; ordinary scroll/disclosure state remains upstream-owned.
- `ChatView.tsx` passes one interaction flag for the paint-only held timeline.
  Both of that timeline's identity props can hold the prior key, so comparing
  those keys alone cannot establish whether it may accept a search request.
- `useAssistantCitationTarget.ts` exposes its existing dismissal logic to search.
  A newer citation closes search; a search command dismisses older citation
  positioning. Delayed search frames are cancelled on close or scope change.
- `SessionSearchBar.tsx` focuses on command, exposes current counts and manual
  earlier-history loading, and restores focus only if focus remains in search
  or falls to the document body. It does not steal another control's focus.

## Preserved bounds

No full-history fetching, DOM walking, regex or inline Markdown rewriting.
The loaded-window page sizes remain owned by client-runtime; this port uses
`loadEarlier` rather than adding another loader. Unsent queue bubbles, setup-only
rows, hidden tool output, binary assets and delegated-agent-only rows are not
silently added to the searchable conversation scope.

## Validation surface

Focused search, timeline projection, dynamic timeline interactions, palette
close coordination, keybindings and citation tests cover the port. Current
web/contracts/shared typechecks and the web build cover integration. Real
browser/computer use requires permission and is a separate integrated gate.
Mobile native search remains deferred; desktop wraps the same web surface.

The original blocked automatic reconcile result remains real history. Manual
resolution, source capture, regenerated recipe and scoped landing provide new
evidence without manufacturing an automatic success.
