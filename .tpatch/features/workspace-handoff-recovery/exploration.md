# Implementation boundary

`WorktreeMcpService` persists metadata binding then queues continuation.
`Orchestrator.detachProviderSession` emits the detach event and durable effect.
`ProviderSessionManager.detach` already passes `detachedThreadId` when releasing
the final attachment of an exclusive session. Use that identity to distinguish
expected termination without modifying the generic queue-failure guard.

`RunExecutionService` owns atomic final run events and exposes a current-attempt
fence. Retain its interruption/cleanup path, but classify the matching typed
detach signal as interrupted and omit a provider failure item.

Extend `SelectionRestart.integration.test.ts`'s existing exclusive fake adapter
and persisted replay harness. Cover workspace change with queued continuation
and a genuine-stream-failure control, awaiting durable events and worker drains.
