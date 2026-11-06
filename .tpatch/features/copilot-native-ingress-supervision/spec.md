# Specification

When a native event handler fails, the runtime's public event stream must fail
with `ProviderAdapterEventStreamError`, the correct driver/session identity, and
the underlying failure. Queued or concurrent drains must fail from that worker
termination rather than waiting on an unreachable receipt.

Intentional scope shutdown must remain interruption, not become a fabricated
provider failure. Healthy interruption, resume identity, request receipts, skill
ownership, late-event attribution, and background-work guards must retain their
existing behavior. No prompt retry, outer reconnect, replacement conversation,
or success-shaped terminal event is introduced.

Extend the adapter fixture only to expose its existing event-consumer fiber.
Add a failing-first case in the adapter test that rejects a routing read during
abort, before native idle, then observes the failed stream and drain with the
same underlying cause and only the originally admitted prompt.

Use the affected-package checks and adjacent tests. Record exact canonical,
recipe and landing proof, and retain any historical native-verifier failure as
a failure. This candidate does not establish a fix for the uncollected #42
receiving-host incident and does not authorize deployment.
