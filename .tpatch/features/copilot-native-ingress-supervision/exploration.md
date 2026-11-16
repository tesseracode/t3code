# Exploration

`packages/provider-copilot/src/server/adapter.ts` owns both queues, the single
ingress fiber, and drain receipts. Its routing refresh can fail through the SDK
protocol-error boundary. Wrap that worker's non-interruption failure once, fail
the public queue, and race drain receipts against the worker's outcome.

`packages/provider-copilot/src/server/adapter.test.ts` already provides a fake
native session, abort, routing RPC, queued event collector, and disposable scope.
Expose that collector fiber rather than adding a second consumer or polling.

The shared drainable worker deliberately logs and skips failed items; that
contract is unsuitable for a provider protocol consumer whose lost events can
invalidate completion or permission state.

The session manager already propagates a failed public stream to subscribers
and releases the runtime; run ingestion already handles non-shutdown stream
failure. Do not duplicate those policies in this adapter or add wrapper tests
for the same causal fault.
