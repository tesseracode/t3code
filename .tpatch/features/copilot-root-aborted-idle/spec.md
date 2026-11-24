# Acceptance

- Explicit root `assistant.idle` with `aborted: true` confirms interruption,
  even while an attached shell defers `session.idle`.
- Root `session.idle` still completes normally or confirms requested
  interruption. Ordinary `assistant.idle`, `assistant.turn_end` and child
  boundaries, including aborted child idle, never complete the root turn.
- Preserve native resume identity and running background-shell ownership.
- Extend the existing interruption regression for both native idle events,
  with retained attached-shell assertions; demonstrate failure before the fix.
- Preserve ingress-error propagation and all existing adapter behavior.
- Validate focused adapter and affected-package source checks, then record only
  adapter.ts, adapter.test.ts and docs/user/providers-copilot.md.
- Independently replay canonical and recipe bytes and modes, inspect parsed
  landing trailers, and retain actual native verifier output.
- Do not claim real native Stop/restart, main acceptance, deployment or any
  receiving-platform/package qualification from source-only tests.
