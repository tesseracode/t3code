# Analysis

The original missing-title report in #36 remains unreproduced. Initial title
generation retries twice and then completes without replacing the placeholder.
The existing final warning does not by itself identify effective routing after
project settings and usage-limit fallback.

The Copilot background generator receives the resolved provider selection.
Its promise helper currently discards the stage on ordinary SDK rejection,
although it preserves the stage on timeout. Client configuration and routing
validation also collapse to the same generic failure.

Add stage-specific typed error details and a failure-only provider-boundary
warning containing an allowlist of selection fields. Do not log the error,
prompt, output, workspace, environment or arbitrary options in that warning.
Preserve the original SDK cause in the existing typed error. No reproduction or
fix of the underlying missing-title symptom is claimed.

This is server-side diagnostics shared by all clients and connection modes.
Other providers, contracts, title retry/fallback policy, native identity and UI
are unchanged. Existing lifecycle tests cover cleanup and cancellation.
