# Acceptance

- An off-by-default Fusion provider switch enables dynamic discovery and plan-v2
  only for that provider's subprocess, preserving unrelated flags.
- Advertised Auto is visually Fusion when Fusion descriptors exist; its separate
  effort control uses advertised labels, IDs, visibility and disabled reasons.
  Canonical persisted model remains auto.
- Provider-default reset is explicit, distinct from omitted preference, and
  survives shared option normalization and subsequent dispatch.
- No uncommitted Fusion text/reasoning or review-scoped answer enters chat;
  committed root output appears once, including before late plan telemetry and
  on native replay. Ordinary Auto and fixed-model streaming remain unchanged.
- Focused regressions cover options, opt-in startup, output ordering and reset.
- Exact native message-origin evidence associates late Fusion metadata with its
  owning run, including pre-send-acknowledgement messages. Previously unassociated
  positions move into the confirmed run without duplicating items or moving
  already-associated positions.
- Real isolated tier demos show results and chosen models. Record actual client
  coverage and any unfinished gates honestly; no production writes or deployment.
