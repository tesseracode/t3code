# Exploration: copilot-sdk-runtime-upgrade

## Result

SDK 1.0.28 remains a viable investigation candidate. Published artifact inspection
confirms the Fusion types and the changed native package layout. No install,
extraction to a runtime directory, executable launch, inference, or production
profile access was performed by this qualification pass.

This is the exploration artifact, not a successful runtime/platform gate.
Implementation requires the next lifecycle phase; do not jump to a manifest edit
or label compatibility proven from these checks.

## Published-artifact qualification

Downloaded the SDK archive in memory through its public npm metadata and checked
the complete archive SHA-512 against `dist.integrity` before inspecting it with
Python's tar reader. No package scripts were run.

- SDK archive: 695,095 compressed bytes; package version 1.0.28.
- Both conditional exports exist: CJS `dist/cjs/index.js` and ESM
  `dist/index.js`, with declarations `dist/index.d.ts`.
- Published `dist/generated/session-events.d.ts` includes durable
  `session.fusion_resolved` and `assistant.fusion_phase_completed`.
- Published RPC declarations expose `auto?: AutoTierMetadata`.
- Published `dist/types.d.ts` exposes `capi.autoTier`, permission callbacks,
  `no-result`, and `continuePendingWork`.
- Published session declarations preserve `getEvents`, `disconnect` and object
  options on `setModel`, and expose `setAutoTier`.
- Built client still discards sibling Auto metadata in `listModels()` and
  starts its CLI child with `--no-auto-update`.
- `runtimeArtifacts.js` uses `@github/copilot-sdk-${platform}` and expects the
  wrapper plus `runtime.node`.

The actual `@github/copilot-sdk-darwin-arm64@1.0.28` archive was also inspected
in memory after verifying complete SHA-512 integrity:

```
sha512-R15W4SUS12DyGiWEX/hxsSWTtvyo+Cxrn4SAbU0NeB1kBb+IzkvKmc85gOefh7QzuRZnSn2Wnch7oOmfoYMuPQ==
```

It has 92 archive entries, 66,938,513 compressed bytes. Relevant members:

| Member below package/ | Bytes | Archive mode |
| --- | --- | --- |
| prebuilds/darwin-arm64/copilot-runtime | 453,984 | 0755 |
| prebuilds/darwin-arm64/runtime.node | 102,639,344 | 0755 |
| prebuilds/darwin-arm64/msal-node-runtime.node | 342,736 | 0644 |
| ripgrep/bin/darwin-arm64/rg | 4,520,448 | 0755 |
| tgrep/bin/darwin-arm64/tgrep | 6,335,680 | 0755 |

Wrapper/library headers identify arm64 Mach-O files. This is format/layout/mode
evidence only, not loadability, signing, SDK handshake or helper execution proof.
The platform package has no `main` or dependency declaration; the new resolver
cannot assume `require.resolve(platformPackage)` returns its executable.

Registry metadata was also inspected for darwin-x64, win32-x64, linux-x64 and
linuxmusl-x64 1.0.28. Those package versions exist with target OS/CPU declarations;
Linux variants distinguish glibc/musl. Their archives were not downloaded or
executed. Windows/Linux/Mac x64 payload content remains unqualified.

## Minimal changeset

| Existing file / boundary | Necessary decision or change |
| --- | --- |
| packages/provider-copilot/package.json | Pin the qualified SDK candidate only after implementation phase begins |
| pnpm-workspace.yaml and pnpm-lock.yaml | Replace old version-specific dependency overrides with reviewed closure; regenerate lockfile, not manual transitive edits |
| packages/provider-copilot/src/server/client.ts:22-63 | Resolve SDK-owned platform package manifest/root and native wrapper; preserve packaged detection, target choice, asar relocation and explicit overrides |
| packages/provider-copilot/src/server/status.ts | Keep actionable SDK/start/auth/catalog errors and bounded cleanup; establish typed catalog metadata access for the child feature |
| packages/provider-copilot/src/server/adapter.ts | Compare exact protocol types; preserve permission receipts and lifecycle, change only actual incompatibilities |
| packages/provider-copilot/src/server/textGeneration.ts | Verify shared client configuration and restricted hidden-session cleanup against the upgraded API |
| scripts/lib/copilot-payload.ts:11-30,75-95,145-219 | Replace old SDK-to-CLI owner graph and binary-layout assumptions; validate native wrapper/library/helpers and reviewed pins |
| scripts/lib/cli-external-packages.ts | Preserve package-prefix externalization; inspect staged root ownership, not merely prefix matching |
| scripts/build-desktop-artifact.ts and scripts/build-cli-archive.ts | Verify their existing stage builders consume the new closure and target packages; touch only if helper changes do not suffice |
| Emitted apps/server runtime dependency ownership | Fix #34 at the module that loads the SDK, with a built-output resolution regression |

Do not assume every row requires a code edit. In particular, the current adapter
already passes object options to `setModel`; that surface is not a newly
discovered incompatibility. Permission callback names and `no-result` also
remain in published declarations. Full protocol/type checks and behavioral
fixtures, not casts, decide whether adaptation is needed.

The CJS export is compatible in shape with the existing external `createRequire`
strategy. That does not establish a successful SDK `require()` or native load
with actual installed dependencies.

## Focused proof boundaries

Extend the existing provider `driver`, `status`, `adapter` and `textGeneration`
test files for any newly changed behavior. Existing cases already exercise
root/child idle, ownership conflicts, permission/input bridging, background tasks
and shutdown; retain them rather than duplicate equivalent assertions.

Extend `scripts/lib/copilot-payload.test.ts` for changed package ownership,
missing wrapper/library, wrong-platform resolution and contained staged closure.
Use existing external-package and desktop artifact tests for dependent staging.
Add a meaningful built-source-server check for #34: resolving from a provider
source cwd is the wrong proxy for the emitted server chunk.

No product changes were made, so those proposed implementation suites were not
run in this exploration. The performed checks were archive integrity,
declarations, package metadata, file modes and native headers.

## Unresolved gates and stop rule

Exact SDK/runtime handshake, permission RPC receipt compatibility, native-store
continuity and rollback safety, Windows/WSL execution, x64 Mac execution, account
catalog eligibility and real model-call events remain open.

Do not begin with a live home or the installed app. Implement and qualify in
isolated state after the lifecycle recipe is ready. Missing-dependency failures
or manifest changes justify installation during that later work, not an
unrequested blanket reinstall now.

Fusion's specification can proceed independently, but its implementation still
waits on this qualified boundary. No reason has emerged to prioritize a Fusion
picker before runtime compatibility.

## Implementation follow-through

The later authorized isolated implementation is captured by the scoped
post-apply.patch and regenerated recipe. The packaging root
`copilot-runtime-packaging` is a hard prerequisite because this upgrade modifies
its resolver/closure/readiness boundary. The older superseded Koffi feature is
not revived as a separate prerequisite.

Final focused tests: 123 passed through `tpatch test --command`; provider, shared
and scripts typechecks plus targeted lint and the final emitted-server build
passed. The real production-only Mac arm64 stage validated and started with no
account/session/inference, reporting runtime 1.0.105 / protocol 3. Companion MSAL
and OneAuth libraries were preserved after the real-stage validator caught their
omission from the initial fixture layout.

Structural verify initially passed with only the provider parent. After adding
the actual packaging prerequisite, verification refuses parent replay: that
parent's canonical patch is not present at this branch's baseline. This is an
open tpatch provenance/replay blocker, not a local test failure and not permission
to remove the dependency or refresh historical canonical patches silently.
See artifacts/qualification.json for remaining target/native-session gates.
