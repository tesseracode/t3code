# Acceptance

- A running native helper holds background completion.
- When it returns a result and becomes idle, its native identity, result and
  run ownership remain visible but the roster and runtime probe report no work.
- Repeated task refresh does not resurrect pending work.
- A follow-up changing the same helper back to running restores pending work.
- Child idle does not end an active root turn.
- Existing idle shell, approval, input and genuinely running task semantics stay
  unchanged. Existing shared pending-work tests must still pass.
