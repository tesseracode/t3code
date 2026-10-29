# Thread find

Thread find uses the existing V2 projection search service and web
`ThreadFindProvider`. It scans server history, emits the initial match before the
final count, and retains bounded per-query navigation and parsed-text caches.
Web and desktop share this path, including remote environments; no client
timeline-wide occurrence index or separate search bar is maintained. Native
mobile does not expose this keyboard-driven find surface.

Activity search is negotiated by the optional `includeActivity` request field
and `activityIncluded` response marker. An older client gets message/plan-only
results even from a newer server; a newer client keeps activity out of its
highlight scopes when an older server does not acknowledge the opt-in. The scan
cache includes this flag so those two document sets cannot collide.

Messages and plans use the shared rendered-text parser. Activity uses
`threadFindActivityText` from `packages/shared/src/threadFindText.ts`, after the
server's ordinary wire projection has bounded dynamic inputs. The timeline
displays this same source summary while find is active and leaves its usual
compact presentation intact otherwise. A summary is the document, not the
activity inspector: command output, raw tool result bodies, diffs and resource
card contents are deliberately excluded. SQL drops non-searchable command
output, diffs and search-result bodies before decoding. Dynamic output is used
only to identify HTML/MCP resource cards that do not render as activity.

An activity match carries its item ID, not its tool group's synthetic row ID.
The incremental row projector opens only the containing group. The outer list
targets the group's detail row and its nested LegendList materializes and
scrolls the selected member. `data-thread-find-entry-id` maps summary text back
to that member without creating duplicate outer highlight scopes. Clipped
summaries use the same `beforematch` reveal mechanism as folded markdown.
Position readers also respect the nested list's viewport.

NFKC matching shares one scanner between server counts and browser highlights.
Compatibility forms and combining sequences map normalized offsets back to the
original source range, including length-changing ligatures. ASCII counting
does not allocate a source-offset map.

Keep the provider below ChatView: query/count updates must not rerender the
composer or unrelated panels. Keep both outer and nested virtualization,
ordinary disclosure anchoring, and the existing scoped history/citation
cancellation rather than introducing another positioning owner.
