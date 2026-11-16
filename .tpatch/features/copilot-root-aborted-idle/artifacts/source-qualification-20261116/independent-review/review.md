# Independent source-candidate review

Reviewed frozen candidate `cf9ef8999bb82d52c622bacdb8441170b8398301` against frozen main `0490e7bb2753ee455d58f9832f6ea943af81b0e0`, pinned upstream `783581d461dc72cdd8f78fc8abb4ad536dfc4547`.

## Result

No actionable product-code correctness finding. Two dependency-provenance gaps are recorded below; do not describe the dependency metadata as entirely byte-exact. Neither is an observed product replay failure or a changed parent generation between a constituent's recorded base and this candidate. This review does not authorize promotion, publication, installation, or runtime qualification.

## Findings

### P2: Ingress captures an inherited stale parent recipe checksum

Location: `.tpatch/features/copilot-native-ingress-supervision/artifacts/patch-generations.json:44-49`; originating inconsistency: `.tpatch/features/copilot-routing-late-telemetry/artifacts/patch-generations.json:13`.

Ingress records `copilot-routing-late-telemetry` generation 1's recipe as:

`41f9ee538b7ad9245515ad32dd59a15ad3391592e0bd4e173cc709d3bb95a3df`

The actual committed parent recipe bytes, and that parent's parsed landing trailer on `c715f234138b5f7af0e825cd67f2f0deb7a790b0`, instead identify:

`d2ea728ea2927fa958e78ffff9414a9183a27d5cf44f879525c89a0995c4b4d5`

The child's captured value agrees with the parent's generation manifest, but not with the committed recipe or parent landing attestation. This inconsistency already exists at frozen main and at ingress's recorded base; it was not introduced by the cancellation fix or by a changed parent generation during composition. All seven candidate roots' own canonical/recipe checksums and landing trailers are exact.

Action: retain this as a distinct inherited provenance discrepancy in the source-candidate decision; if pristine generation attestation is required, repair it through the native generation/reconciliation lifecycle and refresh affected dependent snapshots while preserving historical commits. Do not equate exact product replay or the known `copilot-cli-provider` historical verifier limitation with proof that this checksum matches.

### P3: Scanner's declared hard dependency is absent from its generation snapshot

Location: `.tpatch/features/scanner-canonical-path-exclusion/artifacts/patch-generations.json:32`; compare `.tpatch/features/scanner-canonical-path-exclusion/status.json`'s `depends_on`.

The status declares a hard dependency on `copilot-session-import`, but the recorded generation has `"dependencies": []`. The missing capture means that this record does not attest the parent generation/checksums; it must not be reported as a matching captured snapshot.

Independent comparison closes the immediate composition question: import is generation 3 with identical manifest, canonical patch, and recipe bytes at scanner's exact base `edaafaa1d0715000cb44acb06ea75a0058dbd5e4` and at the frozen candidate. Scanner canonical and recipe reconstruction both exactly match its landing. Native scanner verification also passes.

Action: explicitly retain this missing-snapshot caveat, and capture the declared edge on the next authorized scanner generation refresh rather than relying on the empty dependency snapshot to detect future parent changes.

## Independent replay and trailer outcomes

`replay.py` is an independently authored Python implementation using only disposable external `GIT_INDEX_FILE` indexes, Git object reads/writes, strict canonical file-section application, recipe execution, and complete tracked path/mode/object-ID comparison. It does not import or execute the implementation agent's proof scripts. Index and lock files are removed in `finally` blocks. Only `.tpatch/` administrative metadata is excluded from product comparison.

For all seven roots, Git-parsed trailers contain exactly one correct feature, canonical SHA-256, recipe SHA-256, and base commit; each attestation is on a single-parent constituent landing, whose first parent is exactly the recorded base. Current generation canonical/recipe hashes also match actual bytes. Both independent reconstructions have zero product residual paths and include file modes.

| Root | Landing | Canonical vs landing | Recipe vs landing |
|---|---|---|---|
| device-session-release | fe6a486505b5605c61034d0515f211ac0f014fc6 | exact | exact |
| copilot-session-import | edaafaa1d0715000cb44acb06ea75a0058dbd5e4 | exact | exact |
| scanner-canonical-path-exclusion | d7ff2a45390df46ec7370ce2ea2ba39cc6af4783 | exact | exact |
| workspace-handoff-recovery | 8c6c1e8badce2cb04cd253ab6d752ded6ed9faa2 | exact | exact |
| copilot-native-ingress-supervision | 0c550b84876fc1a74692dadb74c99aa9b46dcf99 | exact | exact |
| copilot-text-generation-failure-diagnostics | 62c69bff27e982b23fd23754703e4c757dfeaae1 | exact | exact |
| copilot-root-aborted-idle | cf9ef8999bb82d52c622bacdb8441170b8398301 | exact | exact |

Complete ordered canonical composition from frozen main and complete ordered recipe composition from frozen main produce the same index tree `c273d9ac96a0229493eee0e484b3cec5c461f67d`; each matches every candidate product path, mode, and blob. That index retains main's administrative metadata, so its complete Git tree ID is not asserted equal to the candidate's administrative tree.

The independently supplied intended local cancellation patch has SHA-256 `6817e90ec92168870f3bccea2c7e884529d06cbf823bb53ae33b819b839e9c2d`. Applying it to frozen main and composing the other six roots produces that same exact product tree. Its raw patch hash differs from the landing's `2fd1866650a237cabdeb0c8563357ee9ff209bf05854070512337b9c9e936963` because the landing is recorded on the composed base; the actual resulting source is identical.

Complete canonical composition from pinned upstream replays the historical proof's 31 ordered roots plus the other six candidate roots, with zero product residuals, including file modes. Index tree: `911b40e7c56c356a0fbd889d81e061569b1d238e` (upstream administrative metadata retained).

Historical canonical file sections are either forward-applied unchanged or accepted only after a strict reverse check proves their full postimage already present. The two already-present sections are `windows-preview-zip-artifact`'s `.github/workflows/fork-native-preview.yml` and `linux-runtime-libatomic-prerequisite`'s `docs/operations/fork-native-preview.md`; they are not discarded drift. No three-way merge, fuzz repair, context stripping, or product-path exclusion was used.

The preserved diagnostics-boundary commit `83efed3d9c` contributes no product diff; its material is administrative evidence. It requires no unexplained product bootstrap transform.

No hard parent's generation manifest, canonical bytes, or recipe bytes changed between any candidate root's recorded base and this candidate. Newly composed roots are of course absent from frozen main where appropriate; that is not stale-parent drift. The two provenance caveats above are separately represented in `replay.json`.

## Product inspection

Inspected the full 39-path product diff, including source, tests, contracts, shared client state, web/desktop and mobile controls, and user/internal documentation. Read AGENTS.md, patch-flow, fork-maintenance, and the generic patch workflow.

* Root cancellation: the installed SDK documents `assistant.idle` as foreground-loop idle while attached shells can defer `session.idle`, and `aborted` as cancellation confirmation. The existing child-event guard runs before the new switch cases. Normal `assistant.idle`, `assistant.turn_end`, and child idle boundaries cannot finish the root; confirmed root abortion can. Normal session-wide idle behavior is retained.
* Ownership: terminalization does not cancel or clear retained shell tasks. The regression checks retained pending task identity and `hasPendingBackgroundWork`. Existing native identity/admission rules are unchanged. No retry, resend, takeover, or provider replacement is added.
* Ingress: handler failure terminates the public event queue with its typed original cause and unblocks drains via the ingress fiber; intentional scoped interruption remains interruption.
* Import: immutable snapshot marker is projected into full and shell reads; no resumable runtime/provider-thread ownership is created for Copilot imports. Server dispatch rejects execution, transfer, fork/merge endpoints, provider changes, generated titles, and workspace changes, independently of client composer visibility. Mobile recovered outbox work is returned to the draft before uploads/provider commands. No claim that native ownership was qualified.
* Discovery: canonical managed roots are excluded, session symlink escape and descriptor/path replacement are checked, malformed or non-chain journals are rejected, and text retention remains bounded.
* Handoff: only an explicit matching session/thread detach is classified as interrupted; unrelated stream closure still fails and holds queued work. Atomic attempt fencing, cleanup failure persistence, and subsequent abandoned-turn recovery remain in place.
* Devices: disconnect uses the existing thread/environment/host/device-scoped close command with shutdown false; close-panel/hide remains distinct, and failures stay visible. Desktop wraps the changed web controls; mobile uses the corresponding existing RPC command. No GUI session was launched in this review.

## Validation and runtime boundaries

Independently executed:

`./node_modules/.bin/vp test run packages/provider-copilot/src/server/adapter.test.ts packages/provider-copilot/src/server/textGeneration.test.ts`

Result: **2 files, 44 tests passed**. Uses fake SDK fixtures, not a paid provider or a real native Stop/restart session. The initial unqualified `vp` invocation was unavailable on this shell's PATH; the existing repository-local runner succeeded without installation.

Read the retained pre-fix failure (`running` versus `interrupted`), implementation agent's 281-test composed behavior log, and check:changed log (format, lint, both knip passes, GraphQL, 33 affected package typechecks, 20 files/441 tests). Those broader logs were inspected, not independently rerun.

Read the prior native Electron qualification JSON for device landing `fe6a486505`: actual renderer disconnect/hide/reopen/offline/recovery evidence with automation limitations, source-built rather than installed distribution. It does not qualify new cancellation runtime behavior, mobile, Windows/WSL, Linux receiving hosts, or release packaging.

## Actual native tpatch results

Executed and retained `tpatch verify <slug> --no-write --json` for every candidate root:

| Roots | Exit | Actual result |
|---|---|---|
| device-session-release, copilot-session-import, scanner-canonical-path-exclusion, workspace-handoff-recovery | 0 | passed |
| copilot-native-ingress-supervision, copilot-text-generation-failure-diagnostics, copilot-root-aborted-idle | 2 | failed: parent-landing-drift, copilot-cli-provider |

All seven report exact landing evidence. The three failures identify historical landing `132c85398c55a623f9cf72dfecff884da6554abc`; **they are not native passes**. Ingress/diagnostics also retain missing recipe-coverage warning-class results. Import/child report later-touch advisories as expected; ordered reconstruction preserves both scanner and cancellation changes.

The `copilot-package-payload-pruning` hard edge satisfied by `0a590fa01af66ec135d2ebf2d5542b08a37dc275` to blocked `windows-portable-packaging-tests` is unchanged from frozen main. This remains a historical/platform caveat, not a new qualified Windows result.

## Evidence

* `replay.py`: complete independently authored reconstruction procedure.
* `replay.json`: full exact per-root hashes, parsed trailers, parent comparisons, recipe operations, canonical sections, tree IDs, and residual arrays.
* `replay-summary.json`: concise script output.
* `<slug>-native.json` and `<slug>-native.stderr`: actual no-write native results.
* `provider-tests.log`: independent mocked-provider run.

Read-only scope respected: no product or .tpatch edits, no normal-index/ref changes, no servers, real providers, devices, checkouts, subagents, PRs, pushes, or external monitoring. The inherited worktree's unrelated `.tpatch/FEATURES.md` modification was present at entry and left alone. All private replay indexes were removed.

Final status also showed a concurrently created untracked `.tpatch/features/copilot-root-aborted-idle/artifacts/source-qualification-20261116/` directory. This reviewer did not create, inspect, or change it; all proof inputs were read from the frozen commit, not that directory. HEAD and main still identify the frozen candidate and frozen baseline respectively.
