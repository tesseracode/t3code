# Analysis

Issue #27 is approved for the six-hour local-only batch. The current web timeline
virtualizes rows with LegendList and remembers its existing disclosure state.
The primary fold row can unmount while its final message remains visible.

Do not infer a fold from the message's run ID: imported responses and steered
segments use synthetic fold keys. Associate the terminal entry through each
existing fold's `entryIds`, and count its unchanged `hiddenEntryIds`.
Expose that existing control beside its terminal message without changing
membership, plans, subagent grouping, or interrupted/active-turn behavior.

Pool visibility observations through `observeIntersection`. An unmounted primary
is not visible. Report only boundary changes, not scroll positions or streamed
text. The lower toggle uses the existing disclosure path but anchors the final
message instead of the offscreen primary row.

Preserve `useDeferredWorkLoading` unchanged on both controls. Existing history
commands are serial per thread and return a no-op once the anchor cursor is
gone, so the two controls cannot issue duplicate successful hydration requests.
Visibility must not gate a restored disclosure's history or its error handling.

The shared web timeline covers browser, desktop, remote connections, and guest
rendering. Native mobile has its own timeline and is outside this request.
No contracts, providers, settings, server, or MCP mutation is needed.
