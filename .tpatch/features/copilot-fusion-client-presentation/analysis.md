# Compatibility

Add opt-in provider settings without changing existing defaults. SDK discovery and
execution need separate dynamic-tier and plan-v2 startup flags. Preserve unrelated
flags and exact provider tier IDs. Web, desktop and mobile already consume server
model names and option descriptors; use that shared path rather than a persisted
synthetic Fusion model slug.

The SDK emits uncommitted drafts and committed snapshots with the same message ID.
Filter using each event's attribution, independently of plan arrival order, while
preserving ordinary streaming. Native history retains only committed snapshots.
The existing native tpatch overlapping-ancestor refusal is independent and retained.

Fusion and root assistant turn IDs can use different namespaces. Correlate root
answers through originatingMessageId and the native user message ID acknowledged
by send, including answers arriving before that acknowledgement. Preserve unknown
ownership when evidence is absent. Late confirmed ownership must also move a
previously unassociated timeline position into its run's range; already-associated
positions remain stable.
