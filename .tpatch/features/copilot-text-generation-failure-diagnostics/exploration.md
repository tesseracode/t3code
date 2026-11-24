# Scope

`packages/provider-copilot/src/server/textGeneration.ts` owns ephemeral native
generation and receives selection after the shared server's fallback resolution.
Its existing `call(stage, operation, timeout)` helper is the SDK boundary.

`packages/provider-copilot/src/server/textGeneration.test.ts` already tests
explicit routing, rejected routing, malformed output, failed routing reset and
cancellation during creation. Extend those failure cases instead of repeating
the behavior in orchestration or client tests.

Hard parent: `copilot-background-routing`, whose current generator and tests
are preserved. Record a strict two-file patch and complete write-file recipe
against the actual feature-branch parent after final formatting.

No client, contract, SDK/runtime dependency, model-facing text, provider policy,
installed application or live state changes.
