# Exploration: attention-notifications

Extend ThreadNotificationCoordinator, NotificationSettings and threadNotifications;
do not add a parallel coordinator or modify Electron's native emitter path.
ClientSettingsSchema/Patch supply local defaults and existing persistence/scoping.
The existing in-app switch remains the only toast-consent surface.

ATT-03 reducer already reports accepted live notification candidates, but ATT-04
only exposes final cache values. Derive a map of still-relevant candidates while
consuming each frame, retaining independent live changes across React batching.
Clear it on nonlive states and completion fences; resolved/deleted entities
leave the map. A completed summary's subsequent same-turn revisions do not
re-notify, and initial completed summaries never create candidates.

Keep policy/deduplication pure and testable. Evaluate current settings and local
time both at candidate delivery and after asynchronous audio decoding. No polling
or delayed quiet-hour event queue is needed.

Notification clicks use current environment access/status, not captured authority.
Static payload text avoids adding a sensitive-detail preference in this slice.
Existing badge lifecycle and fallback tests remain the regression boundary.

## Consolidation and real replay

Metadata-only inbox reanchoring retained its original source anchor, which
lacked the newly extended Foundation. A same-slug source replay passed in
isolation but became ambiguous when joined with the earlier source history.
The maintainer approved a single client-attention superseder instead.

Use the union of the original inbox's complete 16-path scope and this slice's
delivery/settings/docs scope. Generate genuine preimage-bearing operations
against the updated Foundation source baseline, execute them in an isolated
worktree, and compare every product source path with the integrated result.
Record and land the new root there, then merge without changing product bytes.
Keep all earlier failed attempts/history as evidence; do not manufacture a
success for the historical inbox record.

The approved browser pass uses controlled live transport frames and a
Notification stub, not native provider turns or real OS alerts. It found two
UI issues addressed here: new switches need explicit checked ARIA state, and
offline clicks must retain a retry action rather than loading a lazy route.
