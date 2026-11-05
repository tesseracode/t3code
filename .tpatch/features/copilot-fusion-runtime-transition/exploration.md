# Implementation boundary

`packages/provider-copilot/src/server/adapter.ts` owns selection classification.
`ProviderSwitchService` and `ProviderSessionTransitionPolicy` already implement
`restart_session` as restart-and-resume, preserving native thread references.
`ProviderTurnStartService` supplies that reference on reopening. Do not introduce
another restart mechanism or change shared orchestration semantics.

The existing adapter tests can exercise the classifier without starting a CLI.
SDK controls use a disposable profile with no tools or config discovery.
