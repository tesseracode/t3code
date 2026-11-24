# Acceptance

- An unchanged native session uses occupancy telemetry, not cumulative billing,
  even when the previous stored turn reports more than one context window.
- Billing counters remain unchanged.
- Adapters that do not opt out retain current occupancy/replacement behavior.
- A provider declining replacement keeps the original native identity on resume
  or genuine budget failure; do not silently truncate or start a conversation.
- Preserve the original actionable admission/resume failure.
- Extend existing orchestration handoff/recovery scenarios with focused failing
  cases and drain the effect worker rather than sleeping.
- Track https://github.com/tesseracode/t3code/issues/39.
