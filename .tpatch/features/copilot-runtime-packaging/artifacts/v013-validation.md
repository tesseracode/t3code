# v0.1.3 manual-port validation

Source base: `8cbf4544f7b94acc91a545a78a5e1fa74426aeb0` on
`tpatch/packaging-v013`, containing stable v0.1.3
`d2c440312e5f39d59827ed466838a623516454d6` and preserved reconciliation evidence.
This is a source candidate, not an installed-platform or native-provider attestation.

## Preserved scope

- Reviewed SDK 1.0.8 / CLI 1.0.75 / Koffi 3.3.1 dependency closure and all five
  overrides, owner-local/out-of-stage rejection, complete native inventory before
  pruning, all target architectures, universal macOS and idempotence.
- Desktop, Windows sidecar and CLI stages, unchanged WSL archive embedding,
  exact archive membership, command-mode repair and digest-marked warm-cache loss
  detection. Account-home probing uses bounded stdin and rejects extra output lines.
- Preview app/installer, T3/Electron/WSL profile and lock isolation, no stock
  protocol/passkey registration, explicit null update feed, upstream boot.cjs
  retained with a separate compile cache. Normal build paths remain unchanged.
- Manual-only, unsigned, build-only CI with real provenance generation and current
  Node 26.12.1/pnpm 12.14.0. No workflow dispatched, native artifact built or
  installed, signer invoked, provider turn run, or artifact manifest generated here.
- New workspace-owner traversal follows reachable runtime manifests and catalogs,
  refuses missing owners/version collisions and does not hard-code provider imports.
  Windows PE-only unpack/sign checks and the 80-file budget remain intact.
  Vetted ASAR unpack globs now work below an owned hidden staging directory.

The original canonical root already included the fork-preview overlay; this port
did not replace it with a narrower historical patch. Historical patches,
generations and reconcile attempts remain evidence, not newly successful results.

## Dependency decision

`git merge-base --is-ancestor 0a590fa01af66ec135d2ebf2d5542b08a37dc275 v0.1.3`
passed. This is the actual upstream Windows portability commit. Its relevant
host-portable packaging tests remain upstream and run in the focused script suite.
Only this root's obsolete `windows-portable-packaging-tests` hard edge was removed
using `tpatch feature deps`; that feature's blocked v0.1.3 attempt was not changed
to upstream_merged, nor was its old satisfied_by claim copied forward.

`copilot-cli-provider` remains hard and blocked in this branch. Its owner is
porting SDK 1.0.8 into `packages/provider-copilot` and owns the SDK manifests and
lockfile. `pnpm-lock.yaml` and `scripts/lib/cli-external-packages.ts` were not edited
here. Integration must add the full actual Copilot external boundary in that
ownership file, merge the provider owner/lock and rerun closure/staging gates.
The installed dependency set here is baseline-frozen, not a purported integrated
Copilot stage. Five workspace overrides and Koffi build approval match the native
owner's reported pins; no competing lockfile was generated.

## Exact focused validation

Use the worktree root as `$ROOT`; prepend Node 26.12.1 and `$ROOT/node_modules/.bin`
to PATH. All filesystem fixtures used `TMPDIR=$ROOT/.t3/packaging-check`.
Logs below are actual command output in that owned, gitignored directory.

From `scripts`:

```sh
vp test run --config ../vite.config.ts build-desktop-artifact.test.ts \
  lib/cli-external-packages.test.ts lib/copilot-payload.test.ts \
  lib/fork-preview.test.ts lib/runtime-external-dependencies.test.ts \
  -t '^(?!.*(?:probes fff through the packaged Windows primary|skips the primary native probe for cross-architecture Windows payloads|rejects a sidecar whose extracted server bundle cannot resolve)).*$'
```

Passed: **86**, explicitly filtered: **3**; five files passed.
Log: `final-scripts-tests.log`.

The three filtered cases are not passed: the unfiltered artifact-file run refused
self-containment because this task permits writes only inside a worktree with an
ancestor node_modules. The existing refusal and probe logic were retained, not
weakened or mocked away. An added hidden-stage unpack regression was fixed and
verified separately before the final focused run.

From `apps/desktop`, with
`ELECTRON_OVERRIDE_DIST_PATH=$ROOT/.t3/packaging-check/not-installed-electron`
to keep mocked service tests from auto-downloading Electron:

```sh
vp test run src/app/DesktopUserData.test.ts src/app/DesktopClerk.test.ts \
  src/backend/DesktopBackendConfiguration.test.ts src/wsl/DesktopWslEnvironment.test.ts
```

Passed: **54**, platform-unavailable WSL execution skips: **13**; four files passed.
Log: `final-desktop-tests.log`. Initial imports without that override stalled
while Electron's loader attempted a download; those tracked processes were stopped.
No application was installed or launched.

From `packages/shared`:

```sh
vp test run --config ../../vite.config.ts src/copilotRuntime.test.ts
```

Passed: **8**, one file passed. Log: `final-shared-tests.log`.
These POSIX command fixtures do not qualify real WSL.

From the root:

```sh
vp run --filter @t3tools/scripts --filter @t3tools/desktop typecheck
node --check scripts/fork-preview-bootstrap.cjs
node --check scripts/fork-preview-manifest.mjs
git diff --check HEAD -- <28-product-path scope>
```

Passed: both scoped type tasks, both syntax checks, and whitespace check.
Log: `final-types.log`. Changed-source `vp lint` also passed after restoring the
missing repository lint plugin from the unchanged baseline frozen lock, with
scripts disabled and the authored workspace config restored afterward.
Log: `final-lint.log`. No repository-wide checks ran.

Actual stable workspace-owner traversal also passed as a read-only focused script,
resolving Cursor SDK, fff, keyring, node-pty, Playwright and undici from their owners.
Absent native-Copilot ownership/externalization is an integration gate, not evidence
that a Copilot-less stage qualifies.

## Pending gates

Fresh hard-parent/tpatch verification after native-provider integration; isolated
self-containment execution; full locked native stages and complete Windows file
count; actual Mac arm64 build/UI; Linux x64 build/archive smoke; Windows installer
and receiving-host WSL/Ubuntu cold/warm/mode/home/session qualification.
The runbook requires per-target CI attempt accounting (at most four per target)
and actual manifests/transcripts. No prior platform pass is reused.

## Lifecycle result

`tpatch apply copilot-runtime-packaging --mode started` preceded edits.
`--mode done --validation-status needs_review` completed the local manual
materialization without attesting integrated/native qualification.
The full 28-product-path `tpatch record copilot-runtime-packaging --files <scope>
--regenerate-recipe` passed its working-tree round trip and regenerated current
preimages from the real `8cbf4544f7b94acc91a545a78a5e1fa74426aeb0` baseline.

`tpatch verify copilot-runtime-packaging` exited **2**: hard parent
`copilot-cli-provider` is blocked, so shadow parent replay aborted before patch
replay/preimage attestation. Its new verification record correctly says
`passed: false`; reconciliation still says blocked.
`tpatch land copilot-runtime-packaging --no-record` exited **1** on the same
hard-parent gate and created no commit. No gate was overridden.

The source is retained only as an explicitly labelled ordinary Git candidate for
integration, not a tpatch landing. The parent must integrate its independently
landed native-provider root, resolve its own external-boundary/license changes,
and regenerate/reverify/reland packaging against that actual combined baseline.
The candidate commit disables signing and the automatic staged formatter only:
product formatting, lint and types already passed, while reformatting canonical
tpatch JSON would invalidate its recorded byte hashes. No packaging lock, TLS,
payload or dependency gate is bypassed. A whole-tree whitespace check after
record flags blank context lines inside the generated patch; product-source
whitespace validation passes, and those canonical patch bytes are not trimmed.

## Primary integration

The complete source candidate was materialized without committing onto
`75b2ad950`, after native Copilot's real landing `d62b429ab`, search integration,
and the independently verified SDK license root. The five exact runtime overrides
and Koffi build approval are already supplied by the native hard parent; they are
not duplicated as a second conflicting lockfile delta.

The bundler ownership boundary now includes the native SDK/CLI, Koffi and its
platform packages, vscode-jsonrpc and detect-libc. The installed owner-local
manifests were inspected and match SDK 1.0.8, CLI 1.0.75 and Koffi 3.3.1.

With Node 26.12.1 and the worktree's node_modules/.bin on PATH, TMPDIR=/tmp:

```sh
vp test run scripts/lib/cli-external-packages.test.ts \
  scripts/lib/runtime-external-dependencies.test.ts \
  scripts/lib/copilot-payload.test.ts \
  scripts/build-desktop-artifact.test.ts --project root
```

The three dependency/closure files passed all 41 tests. The artifact file first
failed three command-spawn tests because the parent omitted node_modules/.bin
from PATH; its other 42 passed, including the three formerly blocked
self-containment cases. Correcting PATH and running
`vp test run scripts/build-desktop-artifact.test.ts --project root` passed all
45 tests. No test filters or self-containment bypass were used.

`vp lint scripts/lib/cli-external-packages.ts scripts/lib/cli-external-packages.test.ts`
and `tsc --noEmit -p scripts/tsconfig.json` passed. These integration results
supersede the earlier isolated-branch hard-parent and temporary-directory
blockers, but do not replace actual packaged/receiving-host qualification.

A final read-only audit found that this installed tpatch binary's
`--regenerate-recipe` serializer omitted every write-file `preimage_hash`.
The generated recipe was therefore annotated with SHA-256 values computed from
the exact Git blobs at the recorded baseline (empty preimage for genuinely new
paths), not inferred snapshots. All 28 preconditions and current contents were
checked directly against Git/filesystem bytes. This recipe-only follow-up does
not modify product source or claim successful hard-parent replay. A scoped
committed-range record preserves the annotations without regenerating them away.
