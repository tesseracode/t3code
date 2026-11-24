# Analysis: session-search

## Summary

Restore Cmd/Ctrl+F search within the currently loaded conversation on stable
v0.0.42 (`719a76ca1dbf5490f1aa33ffb9966301e02be9a9`), after the Copilot landing.
Upstream cross-thread and project-content search remain unchanged. Browser find
cannot reliably reveal virtualized or folded conversation rows.

## Compatibility

- Semantic adaptation is required; the old recipe and exploration are not safe replay instructions.
- Scope is web/desktop presentation and the shared typed keybinding registry.
- Main constraints are palette focus handoff, held-thread identity, incremental
  row reuse, nested virtualized tool lists and competing citation navigation.
- No provider or new server search API is introduced.

## Technical Notes

- Search projects eligible activity rows through the current timeline logic;
  it does not maintain a competing lifecycle/visibility algorithm.
- Search-only projection unfolds data without mounting rows. The actual renderer
  reveals only the selected turn/group, retaining upstream nested virtualization.
- Scoped search requests are accepted only by the current interactive timeline;
  paint-only held timelines reject them. Closing, thread changes and newer
  citations cancel pending search reveal work.
- No indexing runs while search is closed or the query is empty. Queries are
  bounded and history is extended only through the existing user-triggered loader.
- User/plan expansion is temporary; row-level highlighting does not promise exact
  inline marks inside Markdown, hidden tool outputs or binary resources.
