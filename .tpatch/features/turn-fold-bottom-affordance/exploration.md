# Scope

`MessagesTimeline.logic.ts` already derives the terminal-message set and each
fold segment's membership. Attach the corresponding control and hidden count to
that terminal message while deriving rows; keep stable-row equality aware of it.

`MessagesTimeline.tsx` owns the shared toggle, scroll anchoring, and row rendering.
Use pooled intersection callbacks for primary controls and the existing row
context for visibility, cleaning up on virtualization and thread changes.
The secondary shares the original rendering/loading path without a timestamp.

Extend `MessagesTimeline.browser.test.tsx` with an actual scrolling/toggling
scenario. Do not copy membership assertions into a second layer or add static
markup tests. Manual application will be recorded into the final recipe.
