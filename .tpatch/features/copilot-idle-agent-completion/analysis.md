# Analysis

The adapter already preserves idle agent identity, result, owner and reusable
lifetime. Shared pending-work derivation correctly excludes an idle subagent
turn item. The defect is the adapter's independent task roster and runtime
pending-work probe: both include idle native agents.

Remove only idle agents from those two pending-work views. Keep running agents
and existing shell-task classification. Do not mark retained agents completed,
cancel them, change shared work-status semantics, or edit persisted user data.
