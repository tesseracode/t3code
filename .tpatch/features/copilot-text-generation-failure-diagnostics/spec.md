# Acceptance

- Ordinary configuration, startup, routing discovery, routing selection,
  session-creation, routing-reset and response errors identify their stage.
- Preserve the original SDK rejection as the typed error cause.
- Failure diagnostics identify the operation and resolved provider instance,
  model, stated Auto/Fusion tier and supported reasoning effort.
- The diagnostic payload is an explicit allowlist, not the input, environment,
  account settings, native identifier, arbitrary options, prompt or output.
- Do not change successful generation, retries, fallback, tool restrictions,
  cancellation, cleanup or placeholder-title behavior.
- Extend the existing rejected-routing table and routing-reset case. Prove the
  missing-stage assertion fails before the fix; assert exact diagnostic shape.
- Preserve the original unresolved status of #36.

# Implementation

Use the existing staged SDK helper for rejection details and the named Effect
function's failure combinator for one structured warning per failed attempt.
Keep the complete canonical delta to the generator and its existing test file.
