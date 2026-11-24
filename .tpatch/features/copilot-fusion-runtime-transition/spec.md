# Acceptance

- Entering an explicit Auto routing preference, including Fusion Max, requests
  restart-and-resume through the existing provider selection policy.
- Changing an explicit preference also renews the runtime, so previously retained
  startup flags cannot determine whether a newly advertised preference works.
- An unchanged preference, a concrete-model switch and plain Auto remain
  turn-scoped.
- Native identity and stored conversation are retained. No fresh native
  conversation, history replay, unadvertised tier or silent fallback is introduced.
- Existing orchestration restart/background-work rules remain authoritative.
- Focused regression tests distinguish all transition shapes. Record native
  protocol controls without credentials or personal conversation content.
