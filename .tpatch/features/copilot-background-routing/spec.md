# Acceptance

- Validated opaque tier IDs reach `SessionConfig.capi.autoTier` unchanged.
- Plain Auto and concrete models do not require routing discovery.
- Explicit provider default resets routing before inference.
- Unknown, hidden, disabled or malformed preferences fail before inference.
- Discovery/reset failures are visible and still release owned resources.
- Tool-free/config-discovery-disabled operation, cancellation cleanup and JSON
  validation remain intact.
- Test at the common background-session boundary; do not duplicate each caller.
- Issue #36's reported missing-title symptom remains unconfirmed.
