# Analysis

## Outcome

Native model-request retry and T3 adapter-event recovery are different layers.
The pinned native runtime already retries the tested transient model fault.
Generic event-stream reconnection is blocked on an explicit provider recovery
contract; no additional T3 prompt retry or runtime replacement is justified.

## Qualification

The actual bundled runtime reports version 1.0.105 and protocol 3 with SDK
1.0.28. Disposable native sessions used a loopback-only OpenAI-compatible fixture,
an isolated home and no logged-in account. No vendor inference or tool execution
occurred. `artifacts/native-retry-qualification.json` records the results.

- Two HTTP 503 responses followed by success: three native requests, two native
  retry events, one user message and the same native identity.
- Permanent HTTP 503: six requests, five native retries and one terminal session
  error, with the same native identity.
- Permanent HTTP 401: three requests and two native retries in this particular
  custom-provider fixture. T3 added no retries. This is not permission to add an
  outer authentication retry.

These are measurements of the pinned runtime's custom-provider path, not a
universal policy for every vendor, model or authenticated Fusion session. Adding
five outer retries could multiply work the CLI already retried.

## Recovery constraints

`ProviderSessionManager.startEventPump` consumes adapter events, publishes them
to run subscribers and also ingests runless requests. An unexpected stream exit
fails subscribers and releases the runtime. Persistence-release retries concern
database records; they do not reconnect a provider transport.

`ProviderAdapterV2SessionRuntime.events` may be a single-consumer stream.
`subscribeEvents` is a manager broadcast facility, not a durable provider
subscription with a resume cursor. `resumeThread` preserves a conversation
identity but does not promise continuation of an already accepted request.
`readThreadSnapshot` does not prove that no tool, permission receipt or admitted
prompt was lost at the failure boundary.

The pinned SDK's connection-close path marks sessions disconnected and clears
their handlers. Its public session configuration does not provide an event
replay cursor or an atomic, admitted-request-preserving reconnect operation.
Session history recovery and model-request retry are not substitutes.

## Required boundary before implementation

A provider-specific recovery operation must establish ownership, the admitted
request and a durable replay position without sending another prompt. It needs
explicit retryable transport classification, bounded attempts/deadline,
cancellation, visible recovery state and deduplication of events and actionable
requests. Authentication, validation, unsupported configuration, deliberate
shutdown and worktree handoff are not generic retry signals.

The newly reported steering-linked stall in #42 has not established a transport
failure or a common cause with its older resume failure. Attempt ownership,
ingress supervision and subscriber fencing must remain separate hypotheses.
Reconnection must not mask a still-running native turn or a dead event consumer.

## Scope held

Analysis only. No runtime, contract, client, provider selection, credentials,
native conversation, retry count or attention semantics changed. The feature
must not advance to implementation by treating EOF as a transient network fault.
