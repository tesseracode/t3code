# Spec: session-search

## Retained acceptance criteria on v0.0.42

1. `Cmd+F` / `Ctrl+F` dispatches `chat.search` in the chat surface. The default
   binding is disabled while the terminal or in-app preview owns focus.
2. "Search current thread" is available from the command palette, and
   `chat.search` appears in keybinding settings.
3. Search covers loaded user and assistant message source, proposed plans, and
   the text currently used to present non-superseded activity rows.
4. Matching is case-insensitive, applies Unicode NFKC normalization, counts
   every non-overlapping occurrence, and navigates deterministically with
   next/previous wrap.
5. Enter and Shift+Enter navigate while Escape closes. Re-running the command
   focuses the existing search input. Closing or switching threads clears the
   query and active result.
6. Navigation reveals only the settled turn, activity group, long user
   message, or proposed plan containing the active result. It scrolls
   LegendList to that row without expanding every work group.
7. Search navigation disables live-follow while active and leaves existing
   timeline anchoring, pagination, and disclosure-position restoration in
   control of ordinary scrolling.
8. The active result uses an accessible row-level highlight and live result
   count. Exact inline matched-text highlighting is deferred because current
   message and plan content is rendered through markdown and several
   specialized context renderers.
9. Search is explicitly limited to the client’s loaded timeline window.
   Threads initially load ten user turns; the search bar exposes the existing
   bounded "Load earlier" pagination action (twenty turns per request) and
   labels partial results as loaded-turn-only. No full-history claim is made.
10. Pure tests cover row types, Unicode/case behavior, multiple occurrences,
    wrap, query changes, no results, thread switch/close, and targeted reveal.
11. Preserve upstream incremental projection and nested virtualized tool groups;
    reveal a matching member without replacing the group with unbounded DOM rows.
12. Scoped requests cannot open a previous paint-only timeline during navigation.
    Thread changes, close and newer citation requests cancel pending search
    positioning. Search dismissal of an older citation uses its existing cleanup.
13. Dynamic interaction tests cover scoped command acceptance, palette close/focus
    coordination, user-message reveal, navigation, manual history loading,
    held-thread cancellation, environment collisions and competing citation focus.

## Out of scope

- A new server search contract or full-history occurrence index.
- Regex, case toggles, or persistent search history.
- Searching hidden tool detail bodies, file diffs, images, or superseded
  lifecycle markers.
- Exact inline highlighting inside rendered markdown.
- Mobile keybinding parity.
