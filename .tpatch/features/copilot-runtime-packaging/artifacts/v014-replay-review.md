# Copilot runtime packaging — v0.1.4 replay review

## Scope and actual lifecycle

- Owned branch: `tpatch/packaging-v014`.
- Clean starting/product integration commit: `dde51c8e18801099e417c80dd369e3a9216af8f3`.
- Upstream: `v0.1.4`, pinned to `783581d461dc72cdd8f78fc8abb4ad536dfc4547`.
- Authoritative reviewed intent: the full 31-path canonical patch at
  `5ce5d79bb`, including the late legacy-profile isolation fix, not a last-commit
  delta. The exact historical patch is retained in `v014-canonical-v013.patch`.
- The existing native root/source is an actual prerequisite in the starting
  commit. Foundation/Attention metadata is not evidence that their source was
  replayed; this branch does not implement or qualify those roots.

Required `--help`, `status` and `next` inspections preceded lifecycle commands.
The actual clean-base command
`tpatch reconcile copilot-runtime-packaging --upstream-ref v0.1.4 --format json`
exited **1**, refusing `parent-generation-stale` for `copilot-cli-provider`
(snapshot generation 21 versus current `pg_46e3399bbab9`). Its remediation
circularly proposed the same reconcile. Full stdout/stderr and the starting
commit are preserved in `v014-reconcile-evidence.txt`. No `reapplied` outcome
or materialization success is attributed to that refusal.

Used the supported `apply --mode started` manual path, actually applied the
historical patch with `git apply --3way`, resolved the two real conflicts below,
and completed with `apply --mode done --validation-status needs_review`.
No parent status, recipe, patch, generation manifest or landing evidence was
invented or modified. The inherited old v0.1.3 blocked reconcile result remains
historical; the v0.1.4 refusal is a separate retained receipt.

## Actual conflicts and upstream absorption

1. `scripts/build-cli-archive.ts`: retained upstream's
   `assertLinuxArm64PageCompatibility` import and its native arm64 executable
   check; replaced only the old server-manifest selector import with the
   workspace-owner collector. Both intents are present.
2. `scripts/lib/cli-external-packages.ts`: upstream had made the prefix array
   private. The full root exports it and adds Copilot/Koffi prefixes. Kept all
   upstream exact/subpath Cursor boundaries, including Zod; the new Copilot
   JSON-RPC/detect-libc boundaries do not absorb unrelated package names.

`v014-apply-evidence.txt` contains the real three-way output and both unmerged
paths. That shell pipeline ended at `tee`, so its shell exit was not an
independent `git apply` exit-code receipt. There were exactly two reported
content conflicts; the other paths merged cleanly or used direct application
for new files. No provider resolver, stash, shadow acceptance or fabricated
generation was used.

The clean merge retained v0.1.4's early queued `open-url`/pairing-link handling
in `DesktopClerk.ts`. Source review caught the corresponding additional event
in the newly replayed preview test, whose expectation now includes it.
Preview branding now also overrides `baseName`: upstream
`DesktopAppIdentity.configure` derives the runtime `app.setName` value from
that field, so overriding only the visible `displayName` would restore a stock
runtime name. This is fork-only; ordinary branding is unchanged.

The workflow, provenance helper and operating examples now target v0.1.4,
not the old v0.1.3 product base/version. Manifest creation still derives the
real build/base commits, checks ancestry, permits only the four real
version-only manifest changes and hashes actual built files. No native build
manifest or candidate qualification was synthesized.

## Per-path source audit

All 31 materialized paths were inspected after replay, including changed
source/test hunks and their runtime integration contexts. The machine ledger
`v014-path-audit.json` records actual baseline preimage SHA-256 values, final
source SHA-256 values, recipe byte equality and staged byte equality per path.
New files have an empty preimage, never a made-up hash.

| Path | Review of maintained intent and v0.1.4 interaction |
| --- | --- |
| `.github/workflows/fork-native-preview.yml` | Manual dispatch only; `contents: read`; no publish/release/signing jobs. Pinned v0.1.4 product base. Linux archive precedes Windows embedding. All Windows temporary variables use `C:\t3\tmp`, outside `C:\t3\s`; exact input artifact identities are checked. |
| `apps/desktop/src/app/DesktopClerk.test.ts` | Preview bridge has no stock renderer scheme or passkeys; profile set before the instance lock. Adapted the new preview expectation to upstream's early `open-url` registration; retained upstream ordinary-startup and handoff cases. |
| `apps/desktop/src/app/DesktopClerk.ts` | Uses the isolated state directory and skips stock renderer/passkey registration only for preview. Preserves synchronous pre-ready setup, locking, queued URL events and provider/pairing handoffs. No stock-secret or OS-permission bypass. |
| `apps/desktop/src/app/DesktopConfig.ts` | Adds only the opt-in isolated-preview boolean; defaults false and leaves existing configuration intact. |
| `apps/desktop/src/app/DesktopEnvironment.ts` | Carries preview state, fork display/runtime base name, existing T3 home and overridden app ID. Keeps resources, server.asar, asset, telemetry and local/remote backend path computation. |
| `apps/desktop/src/app/DesktopLegacyLocalStorage.test.ts` | Complete 144-line suite retained. Denies migration-path probes/scans/writes in preview, retains same-preview storage, and exercises normal V1 import/completion-marker behavior. |
| `apps/desktop/src/app/DesktopLegacyLocalStorage.ts` | Preview/development early return occurs before marker probing, stock-profile discovery and LevelDB reading. Ordinary V1 newest-profile selection, retry, take and completion behavior remain intact. |
| `apps/desktop/src/app/DesktopUserData.test.ts` | Preview case fails on any ordinary-profile inspection. Existing Windows credential-preference migration still avoids copying Chromium databases and preserves existing destination state. |
| `apps/desktop/src/app/DesktopUserData.ts` | Preview requires its own base and returns its `electron` subdirectory before stock discovery. Leaves ordinary V2 profile paths, development fallback and Windows Local State migration unchanged. |
| `apps/desktop/src/backend/DesktopBackendConfiguration.test.ts` | Preview WSL test uses the Linux-owned separate home, not Windows data paths; upstream preflight/fallback and environment forwarding coverage remains. |
| `apps/desktop/src/backend/DesktopBackendConfiguration.ts` | Resolves Linux account home only for preview, fails closed if unavailable, and supplies explicit Linux `T3CODE_HOME`. Retains upstream bootstrap secrets, distro selection, network behavior, no-Windows-home forwarding and mounted fallback. |
| `apps/desktop/src/wsl/DesktopWslEnvironment.test.ts` | Cold/warm mode repair and whole-payload-loss fixtures retained; all three command fixtures emit newlines. Selected POSIX/WSL shell owns its filesystem/architecture checks. Home probes cover stdin transport, spaces, invalid/multiline/failed output and bounded completion. |
| `apps/desktop/src/wsl/DesktopWslEnvironment.ts` | Digest marker remembers Copilot presence, validates warm readiness, normalizes modes after hash-verified extraction and before promotion. Preserves locks, entry probes, live-cache retention, cleanup, mounted fallback, probe transport and successful-only home cache. Preview install/prune/invalidate paths remain separate. |
| `docs/operations/fork-native-preview.md` | v0.1.4 build examples, real provenance, runtime identity, profile/Clerk/provider limits, rollback and separate receiving-host gates. Porting does not reset CI allowance. Self-containment refusal is explicitly not bypassed. |
| `docs/operations/release.md` | Adds the reviewed closure, workspace-owner staging, pruning and WSL boundary without changing upstream release/publishing procedures. |
| `packages/shared/package.json` | Adds only the `copilotRuntime` subpath export; all upstream exports/dependencies are retained. |
| `packages/shared/src/copilotRuntime.test.ts` | Archive inventory edge cases plus executable-mode, missing SDK, ambiguous target, command symlink, newline output and non-Copilot behavior cases retained. Native Windows POSIX-mode execution remains appropriately separate. |
| `packages/shared/src/copilotRuntime.ts` | Requires matching SDK/runtime/platform manifests and exactly the target commands. POSIX readiness validates host architecture, non-symlink layout and executable bits; normalization validates before chmod. Non-Copilot payloads remain unchanged. |
| `scripts/build-cli-archive.ts` | Follows reachable provider owners, propagates source overrides into generated stage and validates/prunes before archive cleanup. Preserves native executable choice, arm64 page check, web/monitor staging, signing, tar behavior and source toolchain ownership. |
| `scripts/build-desktop-artifact.test.ts` | Retains upstream macOS payload self-check and Windows gates; replays stage override, hidden ASAR stage, capture-helper cross-host and embedded Copilot archive cases. No file-budget increase or self-containment success stub. |
| `scripts/build-desktop-artifact.ts` | Collector feeds Mac/Linux stage and Windows server sidecar. Retains all five pins, Linux-stage-only musl exclusions and prune-before-pack. Preview overlay is opt-in/unsigned and does not publish. Keeps upstream PE-only unpack/sign rules, archive identity/WSL checks, 80-file whole-app limit, isolated native/runtime probes and v0.1.4 Mac arm64 payload self-check. |
| `scripts/fork-preview-bootstrap.cjs` | Sets isolated Electron/T3 home, app model ID, update policy and compile cache before ordinary boot. Rejects known stock homes/profile symlinks, keeps a preview instance lock, clears inherited dev/remote entry overrides, and delegates to unchanged `boot.cjs`. |
| `scripts/fork-preview-manifest.mjs` | v0.1.4 preview validation, actual Git ancestry/base/build identity, four-manifest version-only transform, actual artifact hashes and optional exact WSL archive identity. Interactive qualification is explicitly pending. |
| `scripts/lib/cli-external-packages.test.ts` | Adds SDK, CLI/platform, Koffi/binding, JSON-RPC subpath and detect-libc boundary cases; preserves upstream Cursor boundaries and bundle/import/closure cases. |
| `scripts/lib/cli-external-packages.ts` | Copilot/Koffi/`@koromix/koffi-*` prefixes and exact/subpath `vscode-jsonrpc`/`detect-libc` additions; upstream Cursor/Zod boundaries and Rolldown marker scanning retained. |
| `scripts/lib/copilot-payload.test.ts` | Full portable target inventory, exact removed-native counts, owner-local dependency drift, no-prune-on-error, foreign package, symlink, missing-loader, universal Mac and already-pruned cases retained. |
| `scripts/lib/copilot-payload.ts` | Pins SDK 1.0.8 / CLI 1.0.75 / Koffi 3.3.1 plus JSON-RPC/Zod/detect-libc. Resolves from actual SDK/CLI owners inside the stage; validates all target native inventories before removal. Keeps core/SDK/search/clipboard and Windows computer-use payload; removes only the reviewed unreachable inventory and glibc-stage Koffi musl binding. |
| `scripts/lib/fork-preview.test.ts` | Covers non-mutating installer identity overlay, removed stock protocol/update feed, preview bootstrap home/cache/lock and live-profile refusal without launching Electron. |
| `scripts/lib/fork-preview.ts` | Fork installer app ID/name/artifact identity, null update publisher and no stock protocol claims; ordinary config object is not mutated. |
| `scripts/lib/runtime-external-dependencies.test.ts` | Reachable owners, catalogs, cycles, unreachable-owner exclusion, missing workspace edges and incompatible flattened versions covered without relying on a global install. |
| `scripts/lib/runtime-external-dependencies.ts` | Traverses the server's actual reachable workspace owners, including `packages/provider-copilot`; merges declared production/optional external roots, resolves catalogs and rejects duplicate/missing/conflicting owners. No fixed server-only Copilot assumption. |

## Capture, preimages and truthful verification

`apply --mode done` was not trusted as a full staged capture. The entire
31-path source set was explicitly staged and recorded using
`tpatch record copilot-runtime-packaging --staged --files <all 31 paths>`.
`record.md` and the actual CLI-generated latest generation retain
`staged-index` capture and the real starting commit.

The first `--regenerate-recipe` record left 15 operation records with stale
content and/or preimages. Evidence is in
`v014-recipe-regeneration-evidence.json`. The recipe was therefore generated
deterministically from the real baseline blobs and final index blobs, not
inferred from metadata. The final source/documentation capture is CLI-generated
generation **15**, `pg_57a5c5bb950d`. Its recipe and patch SHA-256 identities
match the actual artifact bytes. No generation manifest was manually authored
or rewritten; genuine intermediate generations remain historical.

The independent 31-path ledger checks:

- Canonical reviewed path set = materialized source delta = recipe path set.
- Every operation is a whole-file write with exact final source/index bytes.
- Every preimage is SHA-256 of the actual starting-commit blob, or empty only
  for a genuinely absent path.
- Canonical patch bytes equal the entire staged source diff, not a fixup.
- SDK owner manifest, source workspace/lockfile, upstream lock, startup
  recovery, boot self-check integration and source toolchain files are
  unchanged from the starting commit.

`git diff HEAD --check` passed and the index contains no unmerged entries.
The normal tpatch static/replay verifier was attempted without executing
project code: `tpatch verify copilot-runtime-packaging --json --no-write`.
It exited **2** at `parent-evidence-integrity`: the real native parent has
ambiguous landing evidence. Recipe syntax/targets/dependency metadata passed;
recipe replay, patch replay and preimage freshness were not certified by that
verifier. The inherited blocked reconcile result also warns. Full output is
in `v014-verify-evidence.json`. This root does not repair or falsify the
parent's evidence. Independent byte/preimage checks are not labelled as a
successful tpatch verify.

The recorder also reports historical later-touch ownership warnings for
superseded roots (and native-owned pin manifests). These are not new merge
conflicts or actual pin edits: the exact source path ledger excludes
`pnpm-lock.yaml` and `pnpm-workspace.yaml`. Superseded root artifacts are intact.

No project tests, builds, typechecks, lint, dependency installation, app/dev
servers, provider turns, native automation or CI dispatches were run.
`vp` and worktree `oxfmt` were unavailable; formatting/install is left to the
integrated primary rather than fetching tools during this source replay.

## Prepared integrated validation — NOT RUN

Run only after the primary has replayed the full selected root set and
authorized validation. Restore the locked dependency environment there
(Node 26.12.1 / pnpm 12.14.0); do not change SDK pins to satisfy an install.

Focused source tests, including the upstream interactions touched by replay:

```sh
vp test run \
  scripts/build-desktop-artifact.test.ts \
  scripts/lib/cli-external-packages.test.ts \
  scripts/lib/copilot-payload.test.ts \
  scripts/lib/fork-preview.test.ts \
  scripts/lib/runtime-external-dependencies.test.ts \
  scripts/lib/linux-arm64-sea.test.ts \
  packages/shared/src/copilotRuntime.test.ts \
  apps/desktop/src/app/DesktopClerk.test.ts \
  apps/desktop/src/app/DesktopLegacyLocalStorage.test.ts \
  apps/desktop/src/app/DesktopUserData.test.ts \
  apps/desktop/src/app/DesktopEnvironment.test.ts \
  apps/desktop/src/app/DesktopAppIdentity.test.ts \
  apps/desktop/src/app/DesktopStartupRecovery.test.ts \
  apps/desktop/src/backend/DesktopBackendConfiguration.test.ts \
  apps/desktop/src/wsl/DesktopWslEnvironment.test.ts
vp run --filter @t3tools/scripts typecheck
vp run --filter @t3tools/shared typecheck
vp run --filter @t3tools/desktop typecheck
```

For format/lint, use the paths from the current root's recipe, not repo-wide
checks; with the restored tools, `vp fmt --check <scoped paths>` and
`vp lint <scoped source paths>`. Re-run the unmodified tpatch verifier after
the primary resolves native parent evidence, and again against the actual
landed/integrated snapshot.

### Real candidate commands — only after separate authorization

Use a dedicated clean build checkout at the final full-set integration commit.
The release-version transform is build-local and must not be committed.
Use approved owned scratch roots; never use the live install, forbidden
temporary directories, or an ancestor `node_modules` to satisfy a probe.
If the policy permits only in-checkout scratch, self-containment qualification
is blocked: do not move, stub or relax that gate.

macOS arm64:

```sh
node scripts/update-release-package-versions.ts 0.1.4-preview.20261029.1
T3CODE_CLERK_PUBLISHABLE_KEY= T3CODE_CLERK_JWT_TEMPLATE= \
T3CODE_CLERK_CLI_OAUTH_CLIENT_ID= T3CODE_RELAY_URL= \
CSC_IDENTITY_AUTO_DISCOVERY=false \
node scripts/build-desktop-artifact.ts --platform mac --arch arm64 --target dmg \
  --fork-preview --build-version 0.1.4-preview.20261029.1 \
  --output-dir preview-v014/mac --keep-stage --verbose
node scripts/fork-preview-manifest.mjs --directory preview-v014/mac \
  --target mac-arm64 --version 0.1.4-preview.20261029.1 \
  --product-base 783581d461dc72cdd8f78fc8abb4ad536dfc4547
```

Native Linux x64 (clear the same cloud/relay/signing settings as the workflow):

```sh
node scripts/update-release-package-versions.ts 0.1.4-preview.20261029.1
vp run --filter t3 build
cargo build --locked --release --target x86_64-unknown-linux-gnu \
  --manifest-path native/resource-monitor/Cargo.toml
mkdir -p preview-v014/monitor/linux-x64
cp native/resource-monitor/target/x86_64-unknown-linux-gnu/release/t3-resource-monitor \
  preview-v014/monitor/linux-x64/
VP_NODE_VERSION=26.12.1 node apps/server/scripts/cli.ts build-exe --verbose
node scripts/build-cli-archive.ts --platform linux --arch x64 \
  --version 0.1.4-preview.20261029.1 \
  --resource-monitor-dir preview-v014/monitor --output-dir preview-v014/linux
node scripts/smoke-cli-archive.ts \
  --archive preview-v014/linux/t3-0.1.4-preview.20261029.1-linux-x64.tar.gz \
  --expect-version 0.1.4-preview.20261029.1
node scripts/fork-preview-manifest.mjs --directory preview-v014/linux \
  --target linux-x64 --version 0.1.4-preview.20261029.1 \
  --product-base 783581d461dc72cdd8f78fc8abb4ad536dfc4547
```

Native Windows x64, after independently verifying the exact Linux archive's
real manifest/build SHA/version and digest as the workflow does:

```powershell
# C:\t3\s is the clean build checkout; C:\t3\tmp is outside it.
$env:TEMP = 'C:\t3\tmp'
$env:TMP = 'C:\t3\tmp'
$env:TMPDIR = 'C:\t3\tmp'
node scripts/update-release-package-versions.ts 0.1.4-preview.20261029.1
node scripts/build-desktop-artifact.ts --platform win --arch x64 --target nsis `
  --fork-preview --build-version 0.1.4-preview.20261029.1 `
  --wsl-runtime C:\t3\wsl\t3-0.1.4-preview.20261029.1-linux-x64.tar.gz `
  --output-dir C:\t3\release --keep-stage --verbose
node scripts/fork-preview-manifest.mjs --directory C:\t3\release `
  --target windows-x64 --version 0.1.4-preview.20261029.1 `
  --product-base 783581d461dc72cdd8f78fc8abb4ad536dfc4547 `
  --wsl-archive C:\t3\wsl\t3-0.1.4-preview.20261029.1-linux-x64.tar.gz
```

## Remaining platform and authorization limits

- This port has no current build, backend, packaged-web, native-UI, installed
  Windows, Ubuntu/WSL or native session-continuity qualification.
- The prior v0.1.3 backend/packaged-web passes do not qualify v0.1.4.
  Prior macOS native UI remained unqualified; the exact latest hang was not
  established, and upstream recovery changes are not evidence that it is fixed.
- Windows installer execution, whole-app <=80-file measurement, native loads,
  isolated app/profile/local origin, WSL cold/warm executable repair and Linux
  account-home behavior require actual receiving-host verification.
- Linux arm64's upstream native-host/page compatibility path is preserved,
  not newly built or qualified. macOS universal retains both CPU payloads.
- CI has already consumed **3 of 4 attempts per Linux x64/Windows x64 target**.
  No dispatch occurred here; changing product base does not reset the budget.
  The remaining attempt is not automatically authorized.
- No stock-secret access, keychain/Gatekeeper/SmartScreen bypass, permissions
  change, native MCP configuration change, name-based process killing, push,
  PR, main/tag/release mutation or live-install write occurred.
- Web/desktop backend bundling and CLI/WSL stages are in scope. Mobile,
  remote/relay/tunnel contracts, other providers and native-provider/license
  roots are unchanged; actual native SDK/provider pins remain owned by the
  native root.

Landing is scoped to these 31 product paths and this feature's own metadata.
Use the ordinary `tpatch land --no-record` commit; no amend and no post-landing
build/validation work in this worktree.
