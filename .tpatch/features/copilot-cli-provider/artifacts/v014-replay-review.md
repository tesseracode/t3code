# Native Copilot v0.1.4 source replay review

## Scope and evidence boundary

- Owned branch: `tpatch/copilot-v014`.
- Immutable seed: `2a79a1b73b15bdd0aa093967855a8a92fd5799d9`.
- Upstream: `v0.1.4`, `783581d461dc72cdd8f78fc8abb4ad536dfc4547`.
- Inherited metadata: reviewed v0.1.3 `5ce5d79bbdbf17b1d50a0f2a9ee7bda9651c1170`.
- Input canonical patch SHA-256: `d2c6f42fbdf5c69f24b421c4aa741997224a1ef08a8af8fad2861d9a3c526eda`.
- Final complete source patch: 28 files, 186,963 bytes, 4,425 additions / 2 deletions.
- Final patch SHA-256: `5c62d508b66669f6d1c55821cb2ddac16e2936f5bfdcf5ff05b9d7ea2a53af2a`.
- Final recipe SHA-256: `efb15e706e17e187e519ca5878c782e5dfe8c9242a85d5cff8d3113a3308618a`.

This is a source landing, not renewed runtime qualification. All touched source
and test files were read in full **after materializing the replay**; final edited
sections were read again. Manifests/configuration and documentation were read too.
The generated lockfile was inspected through its complete 340-line addition-only
delta, not through all 23,105 unchanged/changed lines. Hashes below bind those reads
to the actual landed bytes. No provider turn, test runner, application, browser,
simulator, dev server, signing, release, push or live-install write was performed.
The five real GPT6 Astra turns and same-session restart on v0.1.3 are historical
qualification only; they are not asserted to have run on v0.1.4.

## Required reconcile and manual materialization

On the clean seed, after reading AGENTS, the skill, `tpatch --help`, status and next:

```
tpatch reconcile copilot-cli-provider --upstream-ref v0.1.4
```

Exit was **0**, but verdict was **blocked**, `phase-4-blocked`, `target-deleted`.
Operation-level results were **0 present / 19 applicable / 11 conflicts**.
The missing path was `apps/mobile/src/lib/providerClients.ts`; the conflict
diagnostic also named mobile/web manifests, web's old registry, and the lockfile.
Reconcile left no product-source delta. Its detailed evidence remains in
`reconcile.md`, `reconcile-session.json`, `reconcile-evidence.jsonl` and
`reconciliation/783581d4-to-HEAD.md`.

The CLI also said:

```
note: --upstream-ref v0.1.4 does not match locked ref upstream/main; skipping lock validation.
warning: tpatch reconcile could not update upstream.lock: malformed upstream ref "v0.1.4" (expected <remote>/<branch>)
```

The tag and lock were not rewritten to disguise that limitation. Raw reconcile
outcome remains blocked; manual source resolution is separate evidence.

Supported manual lifecycle was used: `apply --mode started`, full canonical
`git apply --3way` excluding the obsolete client-registration paths and lockfile,
manual shared-registry resolution, pnpm lock generation, `apply --mode done`
with validation status **needs_review**, then `record --staged --regenerate-recipe`.
No model/provider resolver was invoked. The authoritative patch, not the old
recipe, supplied the complete implementation.

Two additional tooling observations are retained honestly:

1. `pnpm install --lockfile-only --ignore-scripts --offline` failed with
   `ERR_PNPM_NO_OFFLINE_META` for upstream `expo-observe@~58.0.15`.
   `pnpm install --lockfile-only --ignore-scripts` then succeeded with pnpm
   **12.14.0**, preserving every upstream lock entry and adding only this root's
   dependency closure. No install scripts ran.
2. The initial `apply --mode done` / default record captured only seven unstaged
   paths because three-way Git application had staged the other paths. That
   intermediate capture is historical `037-apply.patch`, **not** the maintained
   root. Explicitly staging all 28 owned source paths and running
   `tpatch record copilot-cli-provider --staged --regenerate-recipe` corrected it
   to `038-record.patch` and the complete canonical patch. No generation manifest
   was hand-authored. The generated `record.md` change-summary block describes
   metadata worktree drift rather than its staged capture; its 28-file capture
   provenance and the canonical patch are the source truth.
3. A later whole-delta `git diff HEAD --check` caught a generated extra blank
   line at `record.md:43` and stopped the chained landing before any commit.
   Only that trailing blank line was removed; source hashes were unchanged.

## Upstream/fork conflict decisions

- Upstream centralized mobile/web provider clients in
  `packages/client-runtime/src/providerClients.ts`. Register native Copilot once
  there and depend on its client package from client-runtime. Do not resurrect
  the deleted mobile registry, replace web's re-export, or restore removed direct
  app dependencies. This maps the four historical client paths to two current
  paths; **30 input paths become 28 maintained paths**, not a reduced root.
- Keep upstream version fields, mobile Observe/sourcemap changes, dependency
  removals, new Alchemy/catalog changes and all unrelated lock entries.
- Adapt `t3OrchestrationSystemPrompt` to v0.1.4's second argument, passing the
  actual MCP `device` capability. The instructions remain upstream-owned.
- v0.1.4 can request `forceNewNativeThread` after uncertain handoff delivery.
  The one-native-thread-per-runtime integration cannot safely honor replacement
  by returning its old thread. It now returns a typed ensure-thread error before
  touching that thread. This is a declared limitation, not implemented automatic
  recovery, fork or rollback. A focused unexecuted regression case preserves it.
- Upstream does not contain `githubCopilot` or `@github/copilot-sdk` in its
  server/provider/contracts/client-runtime source. No native implementation was
  duplicated. ACP remains separate and unchanged.

## Per-file post-replay read audit

`READ` means full materialized source inspected, not test execution. `TEST-READ`
means the complete test source was inspected but the test was not run.
All 28 paths below are ordinary **100644** files; there are no executable-bit,
symlink, deletion, or unrelated-root changes in the source patch.

| Path | Status | Intent and upstream coverage |
|---|---|---|
| `apps/server/package.json` | MANIFEST-READ | Workspace native driver dependency; upstream scripts, version and other providers preserved. |
| `apps/server/src/provider/builtInDrivers.ts` | READ | Native driver/env registered; existing providers and usage readers unchanged. |
| `apps/server/src/serverSettings.test.ts` | TEST-READ | Canonical legacy/config precedence and existing-instance-ID migrations retained; upstream secret/project-folding tests preserved. |
| `apps/server/src/serverSettings.ts` | READ | Legacy `copilot` maps to `githubCopilot`; instance IDs and explicit disable intent survive. Upstream atomic fallback selection, project folding and secret transactions preserved. |
| `docs/internals/providers.md` | DOC-READ | Native ownership, permission acknowledgement, root-idle, workspace discovery and forced-replacement limitation; unrelated provider constraints retained. |
| `docs/user/providers-copilot.md` | DOC-READ | Account/env setup, plan/permission behavior, skill discovery and unsupported capabilities stated without runtime qualification claims. |
| `packages/client-runtime/package.json` | MANIFEST-READ | Client-side native package dependency at the upstream centralized ownership boundary. |
| `packages/client-runtime/src/providerClients.ts` | READ | Single shared native client registration, used by web/desktop/mobile; upstream model-family/short-name behavior preserved. |
| `packages/contracts/src/settings.ts` | READ | Only native provider default-disabled registration; all v0.1.4 contract fields retained. |
| `packages/provider-copilot/package.json` | MANIFEST-READ | Exact SDK **1.0.8**, workspace exports, focused selectors. Identical to incoming canonical new file. |
| `packages/provider-copilot/src/client.ts` | READ | Native identity/settings/glyph shared by clients. Identical to incoming canonical. |
| `packages/provider-copilot/src/server.ts` | READ | Native server export. Identical to incoming canonical. |
| `packages/provider-copilot/src/server/adapter.test.ts` | TEST-READ | Entire inherited permission races, root-idle, transcript, resume, tasks/tools/plans/shutdown coverage retained; one safe forced-replacement regression case added. |
| `packages/provider-copilot/src/server/adapter.ts` | READ | Complete native adapter; only v0.1.4 device-instruction signature and typed forced-replacement refusal differ from incoming canonical. See invariants below. |
| `packages/provider-copilot/src/server/capabilities.ts` | READ | Honest native capabilities, no manual compaction/fork/rollback claims. Identical to incoming canonical. |
| `packages/provider-copilot/src/server/client.ts` | READ | `createRequire` SDK loader, native stdio defaults, isolated home/explicit connection override and packaged executable resolution. Identical to incoming canonical. |
| `packages/provider-copilot/src/server/driver.test.ts` | TEST-READ | Cold workspace discovery isolation and no session creation. Identical to incoming canonical. |
| `packages/provider-copilot/src/server/driver.ts` | READ | Per-instance identity/env, managed snapshots, workspace-scoped cold and active skills, maintenance and generation integration. Identical to incoming canonical. |
| `packages/provider-copilot/src/server/status.test.ts` | TEST-READ | Models, reasoning, homes, packaged executable variants and probe cleanup behavior. Identical to incoming canonical. |
| `packages/provider-copilot/src/server/status.ts` | READ | Dynamic allowed-model discovery, supported effort descriptors, scoped skill filtering and bounded probe cleanup. Identical to incoming canonical. |
| `packages/provider-copilot/src/server/textGeneration.test.ts` | TEST-READ | Tool-free sessions, malformed-output cleanup and late-create cancellation. Identical to incoming canonical. |
| `packages/provider-copilot/src/server/textGeneration.ts` | READ | Tool/config-free structured generation, independent deadlines, idempotent finalization and owned-session deletion. Investigation/review-guide requests explicitly unsupported. Identical to incoming canonical. |
| `packages/provider-copilot/src/server/tools.ts` | READ | Command/file/search/MCP mapping and bounded/redacted argument provenance, binary omission. Identical to incoming canonical. |
| `packages/provider-copilot/src/settings.ts` | READ | Opt-in account/home/binary/config discovery with current structured custom-model settings. Identical to incoming canonical. |
| `packages/provider-copilot/src/testing.ts` | READ | Focused testing exports. Identical to incoming canonical. |
| `packages/provider-copilot/tsconfig.json` | CONFIG-READ | Shared TypeScript base and Node types. Identical to incoming canonical. |
| `pnpm-lock.yaml` | GENERATED-DELTA-READ | Entire 340-line added closure read; exact SDK/CLI/Koffi and platform package integrity entries retained. Upstream entries are not removed/modified. |
| `pnpm-workspace.yaml` | CONFIG-READ | Koffi allow-build and all five reviewed nested overrides; upstream catalog/patch rules preserved. |

Fifteen of the eighteen input new files are byte-identical to the incoming
canonical patch. The three intentional differences are the adapter, adapter
tests and user documentation, described above. No native source component was
dropped or substituted by a tiny fix.

### Bound source bytes (SHA-256)

| Path | Lines | SHA-256 |
|---|---:|---|
| `apps/server/package.json` | 97 | `141cf7c1a3dc28aeac5fa732aeb1366fe6b9d3c5dbd22ae6485718aaec2d9161` |
| `apps/server/src/provider/builtInDrivers.ts` | 69 | `a8c64f20c4cab294eca38783625554500aa9bd13af71b7ea0c719d874803a96a` |
| `apps/server/src/serverSettings.test.ts` | 1886 | `0c96affbc52f8d0295e2608893fc4847b6f0f280296f5c9bab295d9aba69f714` |
| `apps/server/src/serverSettings.ts` | 1187 | `01bd6aab7954303ae39f3144109b23d54eb6a942fa1824a53fbce7be32c88527` |
| `docs/internals/providers.md` | 195 | `d1d89d6f40ec78d0f57fa7dbe8a1e12983531c21fc5e69aefca24ff4ed3cf732` |
| `docs/user/providers-copilot.md` | 45 | `244e64898ea514f5fa05c75037a1aeccfea82b36afaf412be884f437d7dde8a6` |
| `packages/client-runtime/package.json` | 535 | `7f1c28b052b1810b37951ef36fed59aeb9454d1a107e7128334aedc4fa51928d` |
| `packages/client-runtime/src/providerClients.ts` | 62 | `e1c98033a6a598fda5cabff3069f3a8d529bf943918efee793ca910c9f225f8f` |
| `packages/contracts/src/settings.ts` | 1742 | `a52bb3bcd0203130db691ff6fbcecf15edf6cc9213ac311873d1a41903224ec0` |
| `packages/provider-copilot/package.json` | 27 | `ee082ad34a8b01aa515a8b564aac43588272df4f29def794a9b9afc32803dc9e` |
| `packages/provider-copilot/src/client.ts` | 18 | `9205d47cc291fe88a55630f6d1815eb86f09a71e708a1057c72ef195bc9bc23a` |
| `packages/provider-copilot/src/server.ts` | 1 | `e2d2b75d1f2d62df8acd40dcea757b2105d675fd78d579e61663ba71df311ceb` |
| `packages/provider-copilot/src/server/adapter.test.ts` | 940 | `a030c6ac8127e55679e242edd0176ec809f14166ddb2774dcee92b1b9beaf923` |
| `packages/provider-copilot/src/server/adapter.ts` | 1589 | `6eaaaf05a01d7d72870a1601f646ea193e315aecbd1aabdc48ccbf551087def2` |
| `packages/provider-copilot/src/server/capabilities.ts` | 93 | `f43073a8f637013c907dce60b6998823734744617ea5491442e3f59bee838d5d` |
| `packages/provider-copilot/src/server/client.ts` | 111 | `1c05c434bcb9a3a8508e8951d07d46d5ee17400777ba01ee79bab6392e63539a` |
| `packages/provider-copilot/src/server/driver.test.ts` | 106 | `5c29fef0e33662ea4815c333adc16145b36d6e3ad1e7daf24c5841b6fd0b28e7` |
| `packages/provider-copilot/src/server/driver.ts` | 189 | `cc914a962a73d6ac07155785a3251529de5da27d5b060f987037b6f83a9fc8df` |
| `packages/provider-copilot/src/server/status.test.ts` | 183 | `ea5b0120e1d1897fa29f61fcbadfe888ad9b0d04ad140ba23ce6daa32c8332e9` |
| `packages/provider-copilot/src/server/status.ts` | 196 | `5e346f38b778e24763d3111287d43b2d87ef92395f9ce1548b3bfeb222ddedfe` |
| `packages/provider-copilot/src/server/textGeneration.test.ts` | 186 | `0f3c675276b1edb9a966cfff8eb0120cd35404ec74a47a6f2aafff404b7c6cf9` |
| `packages/provider-copilot/src/server/textGeneration.ts` | 159 | `2dd33286bff99a2adebef301b027335641a61b7149ec29f31d9c4ae8ea350f78` |
| `packages/provider-copilot/src/server/tools.ts` | 70 | `261fa4958a8caed06b174c0518e079beb0109a1ec5f00115d3ca5da72d99ad1e` |
| `packages/provider-copilot/src/settings.ts` | 46 | `a21ec010005bc3300d368f0ab8249dadf66d6e76c68b9c0cd683db5081879dbf` |
| `packages/provider-copilot/src/testing.ts` | 4 | `129f824ca8cca7c0207724ad94045ea944a00211d31a0aabdf23e91b883536d7` |
| `packages/provider-copilot/tsconfig.json` | 5 | `8a5e49bba080af749930a56abcaa53d9e096dacf1719d78fc6c8c8dac1a38113` |
| `pnpm-lock.yaml` | 23105 | `9ff6da038ad5862f4ec4d76a7ae7a7d45cc25b9807e5eefaa44030dd525d7450` |
| `pnpm-workspace.yaml` | 425 | `cd68836b2f8fac2d69ab6e5e0373bc285a7f8e8e6784a6e72e530e828ca2f3c4` |

## Native invariant coverage

Source-inspected, pending integrated behavioral requalification:

- SDK **1.0.8**, native CLI **1.0.75**, Koffi **3.3.1** remain pinned.
  Nested JSON-RPC **8.2.1**, Zod **4.4.3**, detect-libc **2.1.2** remain pinned.
  No SDK upgrade or ACP substitution.
- Native sessions use `copilot-cli` and existing subscriptions, strong
  `sessionId` references and `continuePendingWork: false`. Concurrent ownership
  is refused/disconnected without aborting the foreign owner's work.
- Successful user turns require accepted send plus root `session.idle`;
  assistant/model-step boundaries, child idle and task boundaries cannot finish
  a root turn. Shutdown/abort/failure remain terminal; task owners retain their
  original run across later root turns.
- Cold skills use metadata-only `client.rpc.skills.discover` and requested cwd.
  Active discoveries publish per-cwd results. Instance-global skills stay empty;
  personal/builtin filtering does not erase project skills.
- Native permission response requires a real `{success:true}` receipt.
  V2 ownership transfers before awaiting delivery; same-answer in-flight replies
  share a receipt, conflicting answers fail, and no stale V2 delivery metadata
  is emitted. Terminal cleanup and pending snapshots preserve in-flight/answered
  ownership, including false/error receipts.
- Live and imported empty tool-only assistant rows are omitted while real text
  whitespace is retained. Tool event arguments/provenance remain bounded.
- Tool-free title/branch/commit/PR text generation retains cleanup and cancellation
  deadlines and removes only owned ephemeral native sessions.

## Legacy skill-controls coverage and truthful graph recommendation

The actual historical canonical patches were inspected, not only their titles:

| Historical feature/intent | v0.1.4 source outcome | Graph decision |
|---|---|---|
| `copilot-skill-controls`: server adapter enable/disable/reload, provider registry forwarding and `server.setSkillEnabled` RPC | **NOT COVERED** by this native root. Current native handles expose only skill listing/discovery; there is no toggle service/RPC. The old implementation also picked an arbitrary active session and swallowed errors, so blindly restoring it would violate workspace isolation and truthful delivery. | Do **not** mark upstream-merged or add a blanket supersedes edge. Keep history and explicit missing-capability evidence; restoring management requires separately authorized service/contract work. |
| Its requested UI toggles | The historical canonical patch contains no UI toggle implementation. UI request/backlog is **not** evidence of shipped UI and is not authorized here. | No new functionality implemented. |
| `copilot-skill-controls-ws-rpc`: register the legacy RPC in `WsRpcGroup` to avoid undefined entries | The current V2 RPC contract has neither the legacy declaration nor handler/registration. The old dangling declaration failure shape is absent, but management semantics are still missing. | Cannot honestly call the entire feature upstream-merged or superseded by this root. If management is later restored, include contract/group/transport coverage in the authorized replacement. |
| Its same-origin HTTP define fix | **Already upstream independently**: web Vite config clears HTTP/WS origins in single-origin dev and explicitly defines both. Left untouched. | One independently upstream-covered subcomponent does not retire the whole mixed feature. |

Native discovery is maintained; mid-session enable/disable/reload is an explicit
missing historical server capability, not silently claimed as covered. No legacy
feature statuses, supersedes edges, or unrelated maintained roots were edited.

## Source validation and deferred commands

- `git diff --check HEAD`: passed.
- `git diff --cached --check`: passed.
- `tpatch record copilot-cli-provider --staged --regenerate-recipe`: passed,
  complete 28-file source capture; patch applies against an index seeded from seed.
- `tpatch verify copilot-cli-provider`: passed structural checks, including recipe
  replay, canonical patch replay and preimage freshness. It warns that raw
  reconcile remains blocked; this is **not** behavioral validation.
- `tpatch land copilot-cli-provider --no-record --dry-run ...`: passed scoped
  staging preview with seed baseline and full patch/recipe hashes.
- Final landing uses scoped `land --no-record` only after the explicit record,
  including the Co-authored-by trailer. Git log and landed tree must be read back.

Prepared for the primary agent **after all maintained roots integrate**, not run:

```
vp test run packages/provider-copilot/src/server/adapter.test.ts packages/provider-copilot/src/server/driver.test.ts packages/provider-copilot/src/server/status.test.ts packages/provider-copilot/src/server/textGeneration.test.ts
vp test run apps/server/src/serverSettings.test.ts -t "Copilot"
vp run --filter @t3tools/provider-copilot typecheck
vp run --filter @t3tools/client-runtime typecheck
```

Packaged dependency closure, Windows/Linux/WSL executable modes, real native
session continuity, integrated provider tests, lint and client verification remain
separate later gates. No local or network listening ports were started; there
were **no port-binding failures**. The failures above are reconciliation and
offline package-metadata failures, not networking tests.
