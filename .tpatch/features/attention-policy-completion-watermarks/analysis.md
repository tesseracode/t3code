# Analysis: policy changes replay legacy completion

The independent reviewer identified a real bug in the actual imperative
notification coordinator: policy changes call `entry.gate.clear()` while retaining
the prior thread snapshots. `clear()` erases both handled and deliberately
skipped completion timestamps. An unsupported attention server can complete
while notifications are off, then opt in, rename the same completed thread and
deliver that old completion. Category and environment-mute edits can likewise
duplicate a completion already handled.

The canonical-approval no-replay test does not exercise this shell fallback.
Fix the gate's policy-reset operation, not fallback authority or persisted
canonical attention. This is separate from the source-compatibility correction
and retains the complete existing attention canonical patch unchanged.
