# Analysis

Compatible with the pinned v0.1.4 fork and SDK 1.0.28. The native ingress worker
currently fails independently of its public event queue. A rejected routing read
while handling `session.model_change` stops that worker; a following native idle
and later drain receipts remain unconsumed. Neither the session manager nor the
owning run can observe the worker's failure through the still-open public stream.

Reproduce this mechanism during interruption with a disposable fake native
session. It is not evidence that the reported #42 incident had this cause.

Propagate an ingress failure as a typed provider event-stream error, preserving
its cause, and make drains observe the same worker's termination. Keep ordinary
scope interruption distinct from a provider failure. Do not retry native calls,
resend admitted prompts, create another native conversation, or claim successful
completion of missing events.

The correction belongs at the Copilot adapter boundary. Existing session-manager
and run-ingestion failure handling remains authoritative for all clients and
connection modes; no contract, UI, or other-provider change is needed.
