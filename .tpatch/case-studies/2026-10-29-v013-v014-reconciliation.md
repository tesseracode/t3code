# Tpatch retrospective: v0.1.3 and v0.1.4

The original sections record the October 29 source reconciliation and local
qualification closeout. Receiving-host Windows/WSL/Ubuntu, physical phones,
OS notification delivery and production promotion were separate gates.
The dated follow-up below records later results without retroactively changing
what the original evidence proved.

## Scope and reproducible identity

| Item | Evidence |
| --- | --- |
| Installed desktop/server baseline | `bc9eeb9a6f5e3fe2e6d58d9c1b14d5ed93d6c2be`, v0.0.42 preview |
| Installed mobile source | `aeb0b48220d2cb83698e2298a163261f75ec5681` |
| Reviewed v0.1.3 candidate | `5ce5d79bbdbf17b1d50a0f2a9ee7bda9651c1170` |
| Immutable v0.1.4 base | `783581d461dc72cdd8f78fc8abb4ad536dfc4547` |
| Built and locally qualified candidate | `16d428db823f17c18ec16a79e1ec12ae4ba795c1` |
| Candidate version | `0.1.4-preview.20261029.1` |
| October 29 strict replay | Eleven roots, tree `226936033452d479986dff3779db6584e39a4342`, zero residual source or file modes outside administrative `.tpatch/` |
| Executed tpatch | 0.16.0 |
| Latest release observed | 0.17.0; notes inspected, binary not installed or executed |

The v0.1.3 exact replay was accepted without rerunning it. Its eight roots
reproduce tree `1f1ec3c996e84a9716e938b488eb81181a2b98d5` from upstream
`d2c440312e5f39d59827ed466838a623516454d6`.

The new proof is retained in
[`v014-candidate-exact-replay.json`](../features/fork-maintenance-policy/artifacts/v014-candidate-exact-replay.json).
Its adjacent `replay-candidate.mjs` reads canonical patches from the named target
commit, orders selected dependencies, applies strictly in an isolated Git index,
and compares the complete tracked tree and modes. It does not certify behavior.
Build manifests identify the four version-only release transforms separately.
Android's standalone build additionally uses the existing development variant
and `T3CODE_MOBILE_UPDATES_ENABLED=0`; these are recorded build inputs, not hidden
source edits.

## What was retained, retired and corrected

The maintained roots entering v0.1.4 were native Copilot, session search, SDK
attribution, portable runtime packaging, Foundation, attention notifications,
private-capture exclusion and fork maintenance policy.

The mobile Hermes polyfill remains truthfully `upstream_merged`. Upstream moved
grapheme validation to the server command boundary; both native clients now boot
and display the conversation without restoring the obsolete polyfill.

The recorded v0.1.3 fixes were inside their complete owning roots:

| Fix | Owning root |
| --- | --- |
| Provider-turn completion incorrectly fenced an entire run | `phase1-foundation` |
| Stale permission snapshots, missing native receipt, terminal-before-receipt race and empty tool-only assistant messages | `copilot-cli-provider` |
| Preview read the stock profile's legacy storage | `copilot-runtime-packaging` |
| Cold workspace-scoped skill discovery | `copilot-cli-provider` |

Issues #31, #23 and the tested narrow-window shortcut portion of #18 use upstream
behavior, not duplicate custom patches. #30 uses native discovery with the
upstream picker. Legacy skill-toggle/RPC feature records were not proof of
shipment: neither deployed `bc9eeb9a` nor the installed mobile source contained
those mutation paths. No new regression or blanket supersession was invented.

Three cohesive corrections were recorded after integrated checks/review:

- `foundation-v014-client-compat`: current RPC test doubles, private
  implementation exports and removal of two genuinely unused mobile wrappers.
  Shared public factories remain; no advertised mobile UI was removed.
- `attention-policy-completion-watermarks`: preserve handled/skipped completion
  watermarks when notification policy changes. Four actual-coordinator browser
  regressions failed before and passed after the fix.
- `fork-maintenance-check-scope`: keep administrative patch archives out of
  application formatting/linting and package-impact classification. Two cases
  failed before; all three metadata-only/mixed/lookalike cases pass afterward.
  Product checks and independent replay remain required.

All replays were followed by source inspection, including unchanged-intent
paths, actual conflicts, deletions and upstream adaptations. Canonical roots
were not replaced with the last small fix.

## What tpatch helped with

1. **Intent survived the architecture change.** The maintained roots provided a
   bounded preservation specification instead of treating every historical branch
   or feature folder as a new independent implementation.
2. **Accounting caught omissions.** The deployed application/build source was
   reproducible; the already-present `.tpatch/local/` ignore rule was the real
   earlier recording gap. Explicit staged path checks also caught incomplete
   captures before they became the final root.
3. **Retirement had evidence.** Mobile segmentation was retired only after
   upstream source and behavioral evidence, not from a heuristic label.
4. **Review corrections remained auditable.** Separate compatibility and behavior
   fixes preserve their failing tests and complete source scope.
5. **The final composition is exact.** The eleven canonical patches reproduce the
   actual CI/native candidate, including the later test-import correction.

These are intent and source-accounting benefits. Tpatch did not discover the
permission races, prove the UI, approve an OS prompt, or qualify receiving hosts.
Those results came from code review, focused tests and actual clients.

## What interfered, and what was operator error

| Observation | Consequence and classification |
| --- | --- |
| `reconcile` returned `reapplied` with `requires_confirmation: true` but no checkout change | Applicability is not materialization. File inspection prevented a false completion claim. A zero exit also occurred with a blocked verdict. |
| Broad prefix-split classification cited unrelated ZIP/settings moves | Search's chat paths still existed. The real port required two textual conflicts and a pending-approval renderer adaptation, not wholesale path migration. |
| Child reconciliation refused a stale parent generation and suggested the same command | Supported manual apply sessions worked on the inspected new base. Parent metadata was not fabricated to bypass the refusal. |
| Default capture missed already-staged three-way changes | Explicit staging and `record --staged` recovered the complete scope. Successful capture output alone was insufficient. |
| `record --from` excluded current working changes | This is committed-range behavior, not a bug; operator assumptions about it caused avoidable work. |
| Recipe regeneration retained old content when the canonical patch had already been captured | Actual recipe bytes and baseline preimages needed inspection, not just path-set comparison. |
| Historical repository helper emitted legacy recipe fields | Current strict-schema rejection was correct. The helper/operator mistake was corrected in the current recipes, with genuine manual provenance. |
| Separate Co-authored-by paragraphs made a search landing's Tpatch block non-terminal | Agent misuse plus a missing land-time validation guard. A supported valid re-attestation did not make the retained malformed ancestor acceptable to the verifier. No history was rewritten. |
| Genuine unchanged-child re-landing still selected an older parent baseline | Reported as [tesseracode/tesserapatch#26](https://github.com/tesseracode/tesserapatch/issues/26). This is distinct from malformed trailers or invalid recipe JSON. |
| Later correction roots changed parent postimages | Combined source replay remains exact, but independent parent verification reports drift. This exposes limits in verifying overlapping stacks. |
| Check-scope had multiple qualifying historical changes | Its final schema and current materialization are valid, but the verifier still cannot choose a usable historical anchor. |
| Scoped land refused a deletion-containing compatibility patch after a successful dry-run | Record-before-ordinary-commit fallback retained the full patch and truthful trailer block. |
| New changed checks formatted/linted historical `.tpatch` data as application source | A narrowly tested maintenance-scope feature now preserves hash-bound evidence instead of rewriting it to satisfy formatting. |

Other failures were not tpatch defects: a first-import Electron installation race,
a wrong test import, changed RPC mock shapes, a macOS `/var` versus `/private/var`
test path, Android Studio's JDK not being on PATH, and outdated simulator tooling.
The source fixes and environment corrections were kept separate.

No all-green tpatch result is claimed. Exact source replay is the accepted
exception to known verifier limitations, not permission to waive behavioral,
review or platform gates.

## Comparison with previous retrospectives

| Earlier evidence | Then | Now |
| --- | --- | --- |
| [April product critique](2026-04-26-product-critique.md) | Useful “Git with intent”; manual recipes, cross-feature capture and post-rebase staleness were costly. | Durable intent remains useful. Capture, recipe and historical metadata friction still recurred. |
| [April fresh-branch reconciliation](2026-04-26-fresh-branch-reconciliation.md) | Fresh semantic application worked; identical cumulative patches across features were temporarily accepted. | Independent roots and exact source/mode equality are a materially stronger standard. |
| [May multi-provider port](2026-05-03-multi-provider-reconciliation.md) | Upstream provider architecture reduced adaptation effort. | Again, upstream's provider/client boundaries deserve credit independently of tpatch. |
| [Corrected May v0.0.23 study](https://github.com/tesseracode/tesserapatch/blob/5120dc9395769fe8148b61836e546729b66cb4dc/docs/state-of-the-art/case-studies/t3code-upstream-v0.0.23-2026-05/local-notes.md) | Two heuristic upstreamed detections were false positives. | Per-file intent review and explicit retirement evidence prevent treating a tool label as semantic proof. |
| [September Phase 0](2026-09-02-v0.0.38-phase0-foundation.md) | Clean single-parent source landings were needed for useful anchors. | The anchor cost persists with a larger stack and parent corrections; even genuine re-landing did not always restore the verifier signal. |

**Better evidence, recurring tool friction** is the defensible conclusion.
v0.1.4 reused working v0.1.3 source and achieved stronger local platform evidence,
but its upstream delta was much smaller and human/tool availability changed.
There was no controlled timing or cost comparison. Do not invent a speedup,
failure-rate improvement, or tpatch-only maintenance time.

### Version caveat

[tpatch 0.17.0](https://github.com/tesseracode/tesserapatch/releases/tag/v0.17.0)
documents deterministic recipe coverage/capture evidence and stronger canonical
byte authority. Those are relevant to evaluate before another reconciliation.
Its notes explicitly do not add replay anchors or change the recipe schema.
They do not prove our parent-baseline or retained-malformed-ancestor cases fixed.
Only 0.16.0 was executed here; this is not a negative benchmark of 0.17.0.

## Would plain Git have been easier?

**Probably for the immediate port mechanics; not automatically for long-term
intent continuity.** A clean stable base, scoped feature commits, three-way
application, semantic edits, tests and tree/mode comparison would avoid much of
the lifecycle, recipe and anchor bookkeeping.

It would still need an explicit ledger of retained, absorbed, superseded and
deferred intent, plus the same native/runtime/receiving-host evidence. Git does
not decide whether upstream satisfies a feature's purpose. A bad historical
merge demonstrates a bad resolution, not that Git cannot handle refactors.

The useful model remains Git plus durable intent. Repeated metadata maintenance
is a real cost; tpatch's net benefit should be measured rather than assumed.

## Grouping and qualification decision

Do not merge unrelated domains merely to reduce directory count or make Doctor
quiet. Native provider behavior, activity search, packaging, Foundation, client
notification policy and maintenance checks have different change boundaries.

The two natural future folds are Foundation compatibility into Foundation and
completion watermarks into attention policy. Keep their evidence/history and
capture complete corrected parents when performing that consolidation. The
eleven-root candidate was already exact at the local closeout; no zero-byte
anchor repair, unrelated mega-patch or unreviewed consolidation was forced into
this release.
The broader Foundation root can later be assessed for attention/TWS/work-item
separation if actual repeated conflict evidence justifies the extra boundaries.

Local evidence includes:

- `check:changed`: format/lint, both Knip passes, GraphQL/patch checks,
  37 package typechecks, 72 test files / 764 passed / 13 skipped.
- Real packaged Mac UI and reversible client-only restart with the independent
  remote retained; original user backend remains healthy.
- Native Copilot resumed the same owned v0.1.3 session. One new GPT-6 Astra turn,
  two stdout-only commands, Android then iOS approvals, two first-attempt
  confirmed receipts, no new empty assistant messages, terminal run and inbox 0.
  Provider execution was on the isolated source backend; packaged clients and
  packaged dependency/load checks are separately identified.
- Actual cold skills, relative clipboard value, 710/1126/710 width changes,
  600px new/existing dispatch and highlighted nested activity search.
- iOS Debug Simulator and Android emulator pairing/history/approval interaction.
- Android standalone, debug-signed ARM64 Release APK with embedded JavaScript
  and OTA disabled; cold boot and fresh server data with Metro stopped.
- Linux/Windows build-only CI passed on the first attempt for this approved
  batch, with three attempts remaining per target.

At that closeout, Windows/WSL/Ubuntu receiving-host behavior, physical phones,
physical iOS release, old Intel Mac compatibility, real OS notification/push
delivery, full off-screen long-plan behavior and cross-machine peer delegation
remained unqualified or deferred. No PR, main promotion, release tag, live upgrade, computer use or OS
security bypass occurred.

## October 30 receiving-host follow-up

The [receiving-host report](https://github.com/tesseracode/t3code/issues/1#issuecomment-6523484823)
records qualification and owned-test cleanup through 12:58 UTC, including exact
focused commands, failures and review boundaries. The separate read-only
post-recovery observer was stopped at 14:30 UTC with its actual exit verified:
all 178 completed samples from 11:32:12 to 14:29:13 UTC passed the sampled
Windows owner and public Windows/WSL version/identity checks, with starts at
least sixty seconds apart. This is not continuous uptime, native WSL ownership,
protected-data or rendering proof; the original exit cause remains unknown.

The tested application remains source
`16d428db823f17c18ec16a79e1ec12ae4ba795c1`. Two independently reviewed roots
were added without changing runtime source:

- `windows-preview-zip-artifact`: optional ZIP workflow output, with NSIS still
  the default. No ZIP build was dispatched or qualified. Both Windows hosts
  instead verified and extracted the existing installer payload without
  executing the installer.
- `linux-runtime-libatomic-prerequisite`: documents the Linux loader dependency
  and the distinction between pristine and dependency-installed qualification.
  It does not install packages or alter runtime behavior.

The [thirteen-root replay](../features/linux-runtime-libatomic-prerequisite/artifacts/exact-replay.json)
exactly reproduces tree `194f437791ac3accb8dd0542fbe75b5378bc52b2` at target
`be4a0ae86808cbba5d23663a1e5d4fbe15493892`, including tracked file modes outside
administrative `.tpatch`. The documentation child's verifier still encounters
the known parent-footprint limitation; no all-green tpatch result is claimed.
No additional CI attempt or replacement native build was needed.

| Receiving-host evidence | Result and limits |
| --- | --- |
| Both Windows hosts | Independently reviewed native startup, real Copilot tool approvals and reversible client-only operation against independent same-machine V2 backends. Primary also proved a cold native continuation and Ctrl+Enter at 600 CSS pixels. Not production catalog or every cross-machine route. |
| First Ubuntu | Packaged native runtime and one supervised no-tools marker, 19 assertions, with limited independent review. A temporary cross-machine forward failed and was cleaned without repair. |
| Dedicated WSL | Pristine image blocked on `libatomic.so.1`; explicitly dependency-installed variant independently supported for cold/warm startup, identity/cache reuse, both/WSL-only/both reversals and cleanup. Nine images reviewed; no provider turn. |
| WSL mode recovery | Same reviewer inspected three additional images and runtime evidence: one `rg` execute-bit fault, normal product-managed cache recovery, repaired `rg --version`, all 27 tracked guest processes exited and originals preserved at phase snapshots. Not in-place repair, a separate fresh native public-version response or continuous preservation. |
| Second Ubuntu | Independently supported runtime/data/ownership subgates, including cold project/identity persistence and complete backend/monitor drain. Initial overall auth-cleanup assertion remains failed; corrected inactive-record closeout is not full PASS. |
| Physical Android follow-up | Independently reviewed in-place update, pairing, retained environments after cold restart and fresh live data. Initial list freshness remains unresolved and explicitly non-blocking. |

Four logical paid product-test turns were reported, not a billing or SDK-call
count. Windows viewport resizing was not substituted for the unqualified
Appearance Chat width preference gate.

A real shipped WSL database snapshot also passed a limited offline import:
one thread, five user/assistant messages and all thirteen auth rows retained;
source bytes unchanged and no extra imports on reopening. This is not native
session/tool-history or credential-usability proof. The focused synthetic
cutover fixture still failed the canonical migration-ledger guard; the guard
was not weakened to hide that failure.

### Preservation incident, not an uninterrupted-success claim

At 10:27 UTC the primary original Windows and managed-WSL owners were found
absent without an authorized production stop. The exact exit time and cause
remain unknown. Bounded logs, events and helper inspection did not establish
a crash, clean shutdown or responsible actor.

Mutations were frozen and private pre-start evidence retained. One unchanged
original-version launch at 10:53 UTC restored both owners, versions and saved
identities, verified by 10:58 UTC. Passive authenticated shell-snapshot evidence
proved protected application access; the other Windows host independently
corroborated public route recovery, not its encrypted catalog or chat rendering.
The original global process census remained incomplete for identified,
longstanding OS/session services; a scoped restoration exception was not
reused as a backup-consistency claim.

Subsequent test cleanup verified actual Windows job membership and separately
observed the detached Linux resource monitor exiting. Original owners and
routes were preserved before and after each stage. The controlled Linux
interruption's backend exit 130 and outer-wrapper exit 1 were retained, not
relabeled exit 0. All owned receiving-host test runtimes were stopped; private
profiles, journals and the test-only cache backup were retained.

No complete production-profile backup, application restore rehearsal,
encrypted-catalog rehearsal or live migration was completed. V1/V2 client
incompatibility and managed-SSH automatic bootstrap remain explicit rollout
constraints. Windows and its managed WSL runtime are one upgrade/rollback
boundary. No PR, main promotion, release tag or computer-use experiment occurred.

### What this adds to the retrospective

Tpatch again preserved intent ownership and exact composition, but did not
provide runtime isolation, discover the loader prerequisite or prove recovery.
The parent-baseline limitation recurred with another legitimate child.

Several obstacles were harness assumptions, not product or tpatch defects:
extractor-created directory modes, requiring archived file UID to equal the
root test shell, comparing timestamps across APIs with different precision,
and treating total historical auth rows as active sessions. On the second
Ubuntu host, the first startup grant and two CLI-issued sessions were genuinely
revoked; an untargeted second startup grant expired without revocation. A later
overstrict guard prevented even invoking the offline cleanup. The failures
remain visible, with no product defect or successful-revocation fiction.

Likewise, the inspected WSL implementation invalidates and restages a damaged
cache. Requiring in-place chmod or unchanged inodes would have tested the wrong
contract; matching sampled inode values alone could not prove cache reuse.
Startup-auth readiness also cannot be inferred merely from public HTTP readiness.

The earlier comparison still stands: better evidence and durable intent, with
recurring metadata overhead. There is no measured tpatch speedup or cost
advantage, and no cause assigned to the original-owner exit. The existing
cohesive future folds remain reasonable; unrelated consolidation or parent
recapture solely to silence verification was not performed.

Receiving-host execution and independent reviews used GPT-6 Astra and
GPT-6.1 Sol in GitHub Copilot CLI, within the reported scopes.

Implementation and integrated verification: GPT-6 Astra in GitHub Copilot CLI.
Specialized implementation, research and independent review: GPT-6.1 Sol in
GitHub Copilot CLI. Source approval is limited to the demonstrated paths.
