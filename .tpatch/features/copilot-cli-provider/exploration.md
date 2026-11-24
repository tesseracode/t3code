# Exploration: copilot-cli-provider

## Current Integration Points

- `packages/contracts/src/settings.ts` — annotated Copilot settings plus legacy key decoding
- `packages/contracts/src/providerRuntime.ts` — Copilot raw provenance sources
- `packages/contracts/src/model.ts` — provider display/default metadata
- `apps/server/src/provider/ProviderDriver.ts` — current driver/instance SPI
- `apps/server/src/provider/builtInDrivers.ts` — built-in registration
- `apps/server/src/provider/Layers/ProviderInstanceRegistryHydration.ts` — legacy/default instance
  synthesis
- `apps/server/src/serverSettings.ts` — persisted setting migration and provider-history recovery
- `apps/server/src/provider/providerSnapshot.ts` — model option and snapshot builders
- `apps/server/src/provider/makeManagedServerProvider.ts` — dynamic snapshot publication
- `apps/server/src/provider/Layers/ProviderRuntimeIngestion.ts` — canonical activity projection
- `apps/server/src/attachmentStore.ts` and `apps/server/src/mcp/McpProviderSession.ts` — current
  attachment and T3 MCP contracts
- `apps/server/src/textGeneration/*` — provider-owned text-generation interface and prompt schemas
- `apps/web/src/components/settings/providerDriverMeta.ts`,
  `apps/web/src/components/chat/providerIconUtils.ts` — active
  provider metadata
- `apps/mobile/src/components/ProviderIcon.tsx` — mobile provider glyphs
- `scripts/lib/cli-external-packages.ts`, `scripts/build-cli-archive.ts`, and `scripts/build-desktop-artifact.ts` — target runtime
  dependency staging

## Historical Seeds

Commit `c5d93565b` and generation-2 `artifacts/post-apply.patch` provided:

- SDK client option and provider-check shapes
- permission/user-input/plan callback mappings
- native session cursor handling
- initial adapter and text-generation tests

They conflict semantically with v0.0.38 in provider settings placement, driver identity, runtime
events, task/usage contracts, text generation, UI metadata, and packaging. The historical
`pnpm-lock.yaml` hunk conflicts directly and is regenerated instead.

## SDK Surface Used

- `CopilotClient` with `mode: "copilot-cli"`
- `getStatus`, `getAuthStatus`, and `listModels`
- `createSession`/`resumeSession`, `send`, `abort`, `disconnect`, and `setModel`
- permission, user-input, exit-plan, event callbacks
- session RPCs for mode, reasoning effort, plan read, skills list, task list, and queued-command
  response

The selected SDK is `1.0.8`; its scoped override and regenerated lock resolve the compatible
Copilot runtime to `1.0.75`. The historical `1.0.82` runtime removed the platform
`./sdk` export that this SDK still requires; do not restore that old exploratory choice.

## Stable v0.0.42 Adaptation

Use `Drivers/instanceIdentity.ts` and `resolveMaintenance` instead of duplicating
identity stamping or handing a static maintenance object to the managed provider.
Upstream no longer exports the old `PROVIDER_OPTIONS` list from session logic;
active provider settings metadata is the current registration surface.
Preserve Antigravity and the refactored dialogs/project-settings migration.

`CustomModelSetting` now includes named entries with capabilities. Copilot uses
that schema and the shared model builder. Text generation passes linked context
and preserves the new `needsRefinement` result.

The SDK has a CommonJS export. All production imports from it are type-only;
`copilotClientOptions.ts` loads the implementation through `createRequire`.
Electron and Node SEA hosts resolve the native binary using the SDK's package
context. Ordinary Node retains the SDK's default transport. This avoids both
unresolvable ESM imports inside SEA and recursively launching the T3 executable.

Review fixes reuse the existing `thread.state.changed` compaction ingestion path, SDK
`deleteSession`, per-session event semaphores, provider snapshot enrichment, and the settings
panel's default/custom instance distinction rather than adding new contracts.

Final teardown hardening uses Effect clock-backed deadlines around SDK RPCs and cleanup, plus the
SDK's public `forceStop()` fallback. The SDK `session.resume` event supplies the concurrent-owner
signal because `CopilotClient.resumeSession()` does not expose `alreadyInUse` on its return value.

Provider-owned text generation narrows the same SDK client to `start`, `stop`, `forceStop`,
`createSession`, and `deleteSession`. Its disconnect, hidden-session deletion, graceful stop, and
force-stop deadlines use Effect's clock so timeout paths are deterministic under `TestClock`.
`createSession()` has its own Effect-clock deadline; because no session handle exists on timeout,
the fallback skips session-level cleanup and terminates the client directly.

`Effect.acquireUseRelease` brackets the per-request client state. Its release callback runs
uninterruptibly after success, typed failure, defect, or fiber interruption; the callback clears
the captured session before bounded disconnect/delete/stop/force-stop work, making repeated
finalization a no-op.

The outer text-generation service factory has no Effect dependencies, so its traced regular
callback returns `Effect.sync` around pure service construction rather than using a generator with
no `yield`. The provider status probe uses a separate bracketed stop result so JavaScript `finally`
control flow cannot replace its primary SDK failure.
