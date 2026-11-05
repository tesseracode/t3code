# Validation

The direct-message variant of the existing newer-stopped-session integration
case failed before the wiring change: no live session was detached. Its separate
selection-command variant passed. Both variants and all eight cases in the file
pass with the change.

`tpatch test` recorded 52 passing adapter, selection-policy, and persisted restart
tests. The final combined seven-file reliability selection passed 126 tests.

`vp run check:changed df3383e475c3d052bcac52259384cec319dc6901`
passed format, lint, GraphQL generation, all 24 affected-package typechecks,
141 adjacent tests, and knip pass 2. Knip pass 1 still reports the unchanged
`@github/copilot-sdk` dependency in `apps/server/package.json`. No intentional
runtime dependency was removed to silence it.

`tpatch verify provider-direct-dispatch-selection-restart` remains blocked
before child replay: the historical `copilot-cli-provider` landing's canonical
patch is absent from the verification baseline. This is not passing historical
native replay. The recorded patch has a separate round-trip check.
Recording also reports a later-touch warning because Foundation's older recipe
owns the entire orchestrator file; that historical recipe was not rewritten.

## Integrated client transcript

Disposable application state, dedicated Copilot profile, SDK 1.0.28 and native
runtime 1.0.105. Inherited routing flags were unset before starting the server.

```text
Fusion disabled; concrete Haiku fixture completes and remembers marker
enable Fusion through Settings after warming the concrete native runtime
composer selects Fusion Max; immediate send completes
requested autoTier=hydrafusion-max; routing and execution phases rendered
same native conversation; fixture marker remembered
detach fixture; owned development watcher reloads the backend after formatting
composer returns to concrete Haiku; cold resume completes
same native conversation; fixture marker remembered
three completed application runs, no provider errors
saved native history: exactly three user messages and three completed turns
```

Before/after client captures and the successful transition recording were retained
privately. The installed application, live profiles, and main branch were not
modified. No deployment or cross-platform packaged qualification is claimed.
