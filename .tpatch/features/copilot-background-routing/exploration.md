# Scope

Reuse `autoTierForSelection` from `routing.ts` and the existing timed native-call
helper in `textGeneration.ts`. Extend the session/client boundary types to
include model discovery and explicit reset. The wrapper operations already pass
their selections to this runner and need no caller changes.

The earlier prototype and its separate worktree are retained unchanged. Extend
the existing background-session case for valid preferences; add a focused
rejection case only where no existing case covers it.
