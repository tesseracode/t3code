# Exploration: actual v014 consumers

`RpcSession` now requires `inboundFrames`; the attention test transport should
declare a failing unused effect rather than imitate heartbeat behavior.
`EnvironmentRegistry` exposes `assertKnownAddress` and `reconcilePlatform`, not
`registerPlatform`. The test registry owns only attention `runStream` leases.

`makeEnvironmentAttentionState` is called solely by the public
`makeAttentionWorkspaceState`; web uses `createAttentionWorkspaceAtoms`.
The TWS decoder constants are consumed only within their module and retain their
literal types when private. No public factory or decoder function is removed.

The two mobile wrappers each instantiate a shared factory, but repository search
finds no importer. They do not contribute UI, mounted state, connection ownership,
or background activity. Existing shared subpath exports are used by web and can
be instantiated by a future genuine mobile owner. Do not mount unused work on
mobile just to make a source graph look live.

Focused validation uses existing Vite+ tests, owning-package typecheck, scoped
format/lint and selected-workspace Knip. Dependency restoration is permitted only
after the targeted runner was missing (initial exit 127 retained locally).
The primary will repeat integrated validation; this root does not run it.
