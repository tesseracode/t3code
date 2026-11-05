# Analysis

The reported concrete-model to Fusion Max attempt failed before native turn
creation. The retained runtime's session catalog omitted `auto`, and
`autoTierForSelection` correctly refused an unadvertised preference. Returning to
the concrete model worked.

Isolated SDK 1.0.28 controls confirm that the same account omits routing metadata
without the startup feature flags and advertises the tiers with them. A newly
configured runtime accepts Fusion Max and a subsequent concrete-model switch.
Enabling Fusion refreshes the provider instance/catalog, but a retained session
still owns its earlier process configuration.

Use the existing `restart_session` selection transition when an explicit Auto
routing preference changes. It resumes the same native conversation with current
provider configuration, rather than weakening account validation or enabling
Fusion for users who did not opt in. Ordinary concrete and plain Auto switches
remain turn-scoped. The worktree-handoff stream closure is a separate incident.
