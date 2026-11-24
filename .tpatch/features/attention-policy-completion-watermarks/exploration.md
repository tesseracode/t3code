# Exploration: preserving existing observation lifetime

The gate already owns `pending`, `handled` and `lastSettled` maps.
`skip(key, at)` advances the handled watermark monotonically. A policy edit must
consume each queued timestamp through that helper before cancellation, leaving
both historical maps intact. Full clear remains correct when the surrounding
snapshot is also discarded during environment/session teardown.

The existing browser fixture directly starts
`startThreadNotifications(registry, router)` and defaults both environments to
explicitly unsupported canonical attention. Its disposable fake timers,
Notification stub and mutable client-policy setup are sufficient; no app or
live environment is needed.

Use the existing headless browser test runner for one parametrized regression
covering opt-in before/after grace and category/mute changes. Keep actual
before/after output separate; passing canonical-approval tests cannot replace
the fallback regression.
