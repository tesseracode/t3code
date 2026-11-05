# Analysis

The integrated flags-off concrete to Fusion Max scenario still failed after
the adapter classified the change as `restart_session`. The trace showed no
selection-policy call on an immediate composer send. That path updated the app
selection but reused its warm native runtime.

The queued-message, active-restart, and separate selection-command paths already
consult selection policy. Extend the immediate same-provider path and reuse the
existing transactional detach/outbox behavior. Native history remains on the
provider thread; only the selected runtime binding changes.

An integration-driven candidate and failing regression were prepared before
registering this follow-up. Keep it separate from the earlier adapter feature
so recording does not absorb subsequent changes to its shared files.
