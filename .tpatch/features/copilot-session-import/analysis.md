# Analysis

Issue #33 requests Copilot CLI import parity without conflating history viewing,
native continuation and live-owner attachment. The target is validated main at
`0490e7bb2753ee455d58f9832f6ea943af81b0e0`, SDK 1.0.28. Existing import supports
Claude and Codex through the server scanner/importer and typed project RPC.

Copilot stores root session events under its configured account home. A bounded
text snapshot can be read without opening a native session. Native continuation
has a separate unresolved constraint: the SDK reports `alreadyInUse` after
construction, while `sessions.checkInUse` is a point-in-time lock observation.
Neither constitutes an atomic fenced transfer from an external controller.
Validate this against disposable runtime sessions before enabling continuation.
Do not treat an imported stopped T3 runtime row as release evidence.

Preserve the current providers, parsing budgets and import idempotency. Snapshots
must carry provenance and an immutable server-enforced read-only restriction,
with matching web/desktop and mobile presentation. Never assign a snapshot native
ownership or allow a provider switch to bypass its restriction. Account homes
must remain distinct even if native IDs collide.

The handoff failure is a separate diagnosed lifecycle defect, not part of this
product patch. Its evidence remains private and in the issue discussion.
