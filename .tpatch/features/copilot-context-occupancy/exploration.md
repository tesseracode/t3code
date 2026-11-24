# Scope

`ProviderAdapterV2SessionRuntime` is internal and is spread through the session
manager wrapper. Optional opt-outs therefore require no wire migration or
transport changes. Copilot declares cumulative usage and unsupported replacement.
`ProviderTurnStartService` owns both the telemetry merge and recovery decision.

Extend `ProviderSwitch.integration.test.ts`'s existing scenario tables; they
exercise event persistence, handoff delivery and native identity across calls.
Other providers retain their existing defaults and replacement tests.
