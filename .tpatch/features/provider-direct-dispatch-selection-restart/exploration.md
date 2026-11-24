# Exploration

`Orchestrator.dispatchMessage` has an immediate same-provider fast path that
did not call `ProviderSwitchService.plan`. The direct send therefore retained
the pre-opt-in native runtime despite the adapter restart classification.

Extract the existing selection/archive detach emission into one local helper.
The immediate path calls selection policy when its selection changes, emits
the same detach event and ordered outbox work, and allocates a replacement
binding before scheduling the turn. Provider-thread native references survive.

Extend the existing newer-stopped-session case in
`SelectionRestart.integration.test.ts` with a direct-message variant. The
variant failed on the missing detach before the source change and passes with
the candidate wiring. Existing account-switch cases remain unchanged.
