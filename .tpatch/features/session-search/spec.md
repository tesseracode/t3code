# Spec: session-search

## Current acceptance criteria on v0.1.3

The v0.1.3 implementation extends upstream's server-backed `chat.find`,
`ThreadFindProvider`, `ThreadFindBar`, and existing incremental timeline.
It does not replay the former parallel client-only search implementation.
The historical criteria below remain an unedited intent reference, as do
the recorded historical patches and blocked reconciliation evidence.

1. Keep upstream's scoped `Cmd+F` / `Ctrl+F`, command-palette action,
   keybinding settings, terminal/preview exclusions, thread/environment
   ownership, retry, and cancellation behavior. `chat.find` is the upstream
   equivalent of the historical `chat.search` entry point.
2. Search rendered conversation text, proposed plans, and the source summaries
   of activity rows: commands, reasoning, dynamic tool labels/read paths/search
   terms, changed file names, task progress, questions/answers, approval prompts,
   provider errors, and notices. The same shared summary is indexed and displayed
   while finding, including the wire's bounded dynamic-input representation.
   Ordinary activity presentation is unchanged outside find.
3. Retain the old root's boundary: hidden expanded tool-output/inspector bodies,
   diffs, image data, embedded HTML/MCP app bodies, setup-only entries, and
   superseded lifecycle markers are not search documents. The historical
   canonical matcher searched `workEntryDisplayLabel`, explicitly not its
   hidden expanded output. Resource cards are not reported as invisible matches.
4. Case-insensitive NFKC matching counts non-overlapping occurrences and preserves
   original DOM offsets through compatibility expansion and combining sequences.
   Keep upstream's deterministic next/previous wrap, bounded navigation cache,
   live count, inline highlights, and thread-scoped query reset.
5. Enter/Shift+Enter navigate from the input; Enter on a navigation button keeps
   native activation. Escape closes from every focused find control, without
   treating IME composition as a command. Reopening refocuses the existing input.
6. Reveal the matching run/attempt, activity group and clipped source summary.
   Resolve tool item IDs to their containing outer row and then the nested
   virtualized member. Scroll and highlight that member, not the group header.
   Keep unrelated groups folded and do not replace nested lists with unbounded DOM.
7. Preserve upstream's live-follow suspension, history anchoring and citation
   cancellation. Opening/requerying from activity uses the visible nested member
   as its viewport anchor. Closing find restores ordinary activity presentation.
8. Use upstream's server-backed full-thread search and automatic targeted history
   loading rather than resurrecting the old loaded-window limitation and manual
   pagination bar. This expands coverage; it does not claim hidden resource bodies.
9. Focused service tests prove SQLite/memory agreement, mixed message/plan/activity
   ordering, Unicode, wrap, folded-answer de-duplication, and hidden/resource bounds.
   Real headless component tests prove nested activity materialization, visible
   highlight/navigation, unchanged message highlights, folds, and keyboard controls.
   The coordinator owns separate integrated browser/visual verification.
10. Negotiate activity inclusion across the wire. Older clients must never receive
    activity matches they cannot reveal; older servers must not cause newer clients
    to highlight activity absent from their counts. Include the opt-in in scan cache
    identity and preserve message/plan search without it.

## Historical acceptance criteria on v0.0.42 (retained)

1. `Cmd+F` / `Ctrl+F` dispatches `chat.search` in the chat surface. The default
   binding is disabled while the terminal or in-app preview owns focus.
2. "Search current thread" is available from the command palette, and
   `chat.search` appears in keybinding settings.
3. Search covers loaded user and assistant message source, proposed plans, and
   the text currently used to present non-superseded activity rows.
4. Matching is case-insensitive, applies Unicode NFKC normalization, counts
   every non-overlapping occurrence, and navigates deterministically with
   next/previous wrap.
5. Enter and Shift+Enter navigate in the input while Escape closes from any
   focused search control, including navigation/history buttons. Preserve native
   Enter activation on those buttons. Re-running the command
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
