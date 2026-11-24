# Analysis

Tracking: #44. SDK remains pinned to 1.0.28. Attached background shells can
defer `session.idle` after native cancellation emits root `assistant.idle`
with `aborted: true`. Ignoring that explicit boundary leaves the turn running.

This is a narrow dependent root, not a replacement for the complete
`copilot-native-ingress-supervision` or `copilot-idle-agent-completion`
generations. It changes their adapter only at the root idle dispatch.
Normal assistant/model-step boundaries cannot prove successful completion.
Child events are filtered before this dispatch and must remain nonterminal.
Retained shells remain owned and running; no retry, resend, takeover or
replacement native session is introduced.

The frozen maintainer patch supplies the intended adapter, existing regression
extension and user documentation. Real Copilot Stop/restart is not authorized
tonight and remains an unproven receiving-runtime gate.
