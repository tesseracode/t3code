# Implementation Record: copilot-cli-provider

**Recorded**: 2026-10-29T17:25:52Z
**Files changed**: 28
**Patch size**: 186951 bytes
**Capture mode**: committed-range
**Base commit**: 2a79a1b73b15bdd0aa093967855a8a92fd5799d9
**Upper bound**: abe2cb6ad8e1638c2d078fec500d264a61035245
**Pathspecs**: apps/server/package.json,apps/server/src/provider/builtInDrivers.ts,apps/server/src/serverSettings.test.ts,apps/server/src/serverSettings.ts,docs/internals/providers.md,docs/user/providers-copilot.md,packages/client-runtime/package.json,packages/client-runtime/src/providerClients.ts,packages/contracts/src/settings.ts,packages/provider-copilot/package.json,packages/provider-copilot/src/client.ts,packages/provider-copilot/src/server.ts,packages/provider-copilot/src/server/adapter.test.ts,packages/provider-copilot/src/server/adapter.ts,packages/provider-copilot/src/server/capabilities.ts,packages/provider-copilot/src/server/client.ts,packages/provider-copilot/src/server/driver.test.ts,packages/provider-copilot/src/server/driver.ts,packages/provider-copilot/src/server/status.test.ts,packages/provider-copilot/src/server/status.ts,packages/provider-copilot/src/server/textGeneration.test.ts,packages/provider-copilot/src/server/textGeneration.ts,packages/provider-copilot/src/server/tools.ts,packages/provider-copilot/src/settings.ts,packages/provider-copilot/src/testing.ts,packages/provider-copilot/tsconfig.json,pnpm-lock.yaml,pnpm-workspace.yaml

## Capture Provenance

- **capture_mode**: `committed-range`
- **pathspecs**: apps/server/package.json, apps/server/src/provider/builtInDrivers.ts, apps/server/src/serverSettings.test.ts, apps/server/src/serverSettings.ts, docs/internals/providers.md, docs/user/providers-copilot.md, packages/client-runtime/package.json, packages/client-runtime/src/providerClients.ts, packages/contracts/src/settings.ts, packages/provider-copilot/package.json, packages/provider-copilot/src/client.ts, packages/provider-copilot/src/server.ts, packages/provider-copilot/src/server/adapter.test.ts, packages/provider-copilot/src/server/adapter.ts, packages/provider-copilot/src/server/capabilities.ts, packages/provider-copilot/src/server/client.ts, packages/provider-copilot/src/server/driver.test.ts, packages/provider-copilot/src/server/driver.ts, packages/provider-copilot/src/server/status.test.ts, packages/provider-copilot/src/server/status.ts, packages/provider-copilot/src/server/textGeneration.test.ts, packages/provider-copilot/src/server/textGeneration.ts, packages/provider-copilot/src/server/tools.ts, packages/provider-copilot/src/settings.ts, packages/provider-copilot/src/testing.ts, packages/provider-copilot/tsconfig.json, pnpm-lock.yaml, pnpm-workspace.yaml
- **claim_ids**: (none)
- **base_commit**: `2a79a1b73b15bdd0aa093967855a8a92fd5799d9`
- **upper_commit**: `abe2cb6ad8e1638c2d078fec500d264a61035245`

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/copilot-cli-provider/artifacts/post-apply.patch
```

*Patch was captured as a committed diff from `2a79a1b73b15bdd0aa093967855a8a92fd5799d9` to `HEAD`.*
