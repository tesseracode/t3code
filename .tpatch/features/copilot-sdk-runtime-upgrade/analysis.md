# Analysis: copilot-sdk-runtime-upgrade

## Decision

Prioritize SDK/runtime compatibility qualification before Fusion implementation.
Keep them as separate features: this feature establishes a working provider and
distributable dependency closure; `copilot-fusion-model-selection` adds eligible
routing selection and durable concrete-model/timing visibility.

**Compatibility: requires semantic adaptation; not yet runtime-qualified.**
SDK 1.0.28 is a source-inspected candidate, not an approved upgrade or a proven
minimum. No packages were installed, sessions opened, or live settings changed.
This analysis does not authorize implementation, paid tests or deployment.

## Baseline and evidence

The feature worktree provider source matches deployed runtime commit
`16d428db823f17c18ec16a79e1ec12ae4ba795c1`. It pins:

- SDK 1.0.8 in `packages/provider-copilot/package.json`.
- CLI 1.0.75, Koffi 3.3.1, JSON-RPC 8.2.1, Zod 4.4.3 and detect-libc 2.1.2
  through `pnpm-workspace.yaml:232-237` and
  `scripts/lib/copilot-payload.ts:11-30`.
- Owner-relative, contained-stage dependency validation and platform-specific
  pruning in `scripts/lib/copilot-payload.ts`.

The historical `upgrade-github-copilot-sdk-to-0-3-0-adapt-the-copilot` describes
an earlier permission/Windows migration and is blocked. It is not the scope or
base patch for this upgrade; leave it preserved.

Source server #34 demonstrates missing SDK resolution from emitted server
chunks. A symlink was a confirmed local workaround, not a distribution fix.
The upgrade must not inherit that false-readiness path.

The existing Intel platform launcher reports CLI 1.0.106-2 normally but 1.0.75
with `--no-auto-update`. SDK 1.0.8 supplies that flag to its child. A terminal
`copilot --version` is therefore not sufficient evidence for T3's runtime.
Capture both SDK version and actual selected runtime under SDK startup flags.

## Candidate differences and work entailed

| Area | Finding | Required work / proof |
| --- | --- | --- |
| Native package ownership | 1.0.28 npm metadata uses `@github/copilot-sdk-<platform>` optional dependencies, not the current SDK-to-`@github/copilot` chain | Update owner-relative resolution and staged closure for the exact selected package artifact |
| Runtime entry point | Candidate resolves a `copilot-runtime` wrapper with `runtime.node`; current `client.ts:40-63` resolves old `@github/copilot-<platform>-<arch>` entries | Preserve explicit overrides; resolve the new bundled layout without falling back to an ambient unrelated CLI |
| Pinned dependencies | Candidate metadata declares Koffi 3.2.1 and Zod 4.3.6 versus fork 3.3.1/4.4.3 | Reassess overrides and regenerate lockfile through the package manager during implementation; neither retain nor downgrade pins blindly |
| Model API | Routing catalog is a sibling `auto` field, omitted by `client.listModels()` | Establish supported typed RPC access for Fusion; do not implement its picker here |
| Session selection | Candidate exposes object options for `setModel()` and committed/pending Auto state | Adapt the existing explicit-model/effort path as necessary; leave new Fusion behavior to its child |
| Session lifecycle | Candidate still exposes create/resume, baseDirectory, permission/input handlers and subagent streaming controls | Compare exact types and replay fixtures; API-name continuity alone does not establish semantic compatibility |
| Runtime closure | Current validator requires exact old SDK/CLI packages, binaries and helper paths | Update validation/pruning against actual target payloads, executable modes, native helpers and transitive resolution |
| Server startup | #34 fails before meaningful provider use on source-built release | Prove require-resolution from emitted server output, and report actionable readiness failures rather than generic CLI-not-found |

Candidate npm metadata declares Node `^20.19.0 || >=22.12.0`.
Its `copilotCliVersion` is 1.0.105; release notes describe a 1.0.105-1 snapshot.
These are package facts, not permission to mix arbitrary CLI builds with the SDK.
Use the candidate's matched distribution first unless a documented, qualified
override is necessary.

### Provider invariants to preserve

Keep `mode: "copilot-cli"`, subprocess isolation, native session IDs and native
session-store continuity. No ACP rewrite, in-process-runtime adoption, new
orchestrator, account switch or auth-storage migration is required.

`client.ts:66-119` currently preserves explicit binary configuration, connection
overrides, COPILOT_HOME/baseDirectory and per-instance environment. Keep these
precedence rules. A new default runtime must not unexpectedly co-own sessions
or use a different instance's account home.

`adapter.ts:1204-1231` bridges permission/input callbacks and resumes with
`continuePendingWork: false`. Preserve actual applied permission receipts,
input delivery, refusal of already-owned sessions, root-only final transcript,
root idle completion, interruption, stop and bounded teardown. New SDK defaults
must not silently enable pending work or child text in the root transcript.

Candidate create/resume registers handlers before its RPC to avoid early-event
loss (`client.ts:1706-1760,2053-2110`). The adapter must also preserve event
buffering around initialization; verify behavior, not just successful typing.
Hidden text-generation sessions share this SDK upgrade and need their existing
bounded cleanup and no-ambient-tools behavior preserved.

## Scope and separation

This feature owns version/lock changes, directly necessary API adaptation,
runtime resolution, source/desktop/archive dependency closure and corresponding
regressions. A minimal #34 resolution repair belongs on this boundary if it is
necessary to produce a working source distribution; retain the issue as its
tracking record and do not duplicate it in another feature without a reason.

Do not absorb Fusion UI, telemetry storage, quota reporting (#26), context-tier
controls (#21), custom agents, voice, or general SDK capability exposure.
Do not refresh unrelated historical tpatch patches or alter the deployment.

Web/mobile do not load the SDK: this is primarily a server/runtime change.
Desktop adds Electron/asar/native staging; source servers, standalone archives,
Windows/WSL and macOS must resolve the same qualified closure. Preserve remote,
relay and per-instance behavior without frontend contract changes unless an
actual adapter incompatibility requires them.

## Qualification sequence for definition

1. Select the exact released SDK/platform artifact and inspect its contents,
   exports and runtime protocol. Compare against 1.0.8 before approving a bump.
   If 1.0.28 requires disproportionate changes, investigate an earlier released
   version with the required Fusion contracts; do not guess a minimum.
2. In an isolated implementation worktree, adapt the minimal runtime boundary
   and run existing provider tests plus focused new regression cases for
   changed semantics. Validate source-server SDK loading from built output,
   not from a package directory that happens to resolve it.
3. Use a disposable home and copied/synthetic sessions to establish native
   create/resume, ownership, approval/input, cancellation and completion.
   Real inference requires separate approval; deterministic fixtures cannot
   prove live provider compatibility.
4. Validate staged target closures and startup under Electron and standalone
   Node/SEA, Windows, WSL/Linux and both Mac architectures intended for rollout.
   Inspect native assets before rewriting pruning rules. No other machine's
   successful host build counts as target execution proof.
5. Establish account-advertised Auto/Fusion metadata through an explicitly
   scoped non-inference capability probe. This is the handoff contract for
   Fusion, not evidence that all accounts or routed patterns are supported.

Use existing focused suites, extended only for meaningful changed behavior:

- `vp test run packages/provider-copilot/src/server/adapter.test.ts packages/provider-copilot/src/server/status.test.ts packages/provider-copilot/src/server/driver.test.ts packages/provider-copilot/src/server/textGeneration.test.ts`
- `vp test run scripts/lib/copilot-payload.test.ts scripts/lib/cli-external-packages.test.ts scripts/build-desktop-artifact.test.ts`

These are proposed implementation gates, not commands run for this analysis.
Targeted lint/typecheck and changed-check policy apply when implementation is
ready. Do not run repo-wide checks. Back up any copied native sessions before
new-runtime qualification; do not assume SDK or native-store downgrades are safe.
Preserve the deployed release/profile for rollback rather than upgrading in place.

## Priority relative to Fusion

| Feature | Value | Main uncertainty | Priority |
| --- | --- | --- | --- |
| SDK/runtime upgrade | Unlocks supported routing contracts and a reproducible provider runtime | Native packaging, session compatibility, emitted-server resolution | First technical gate |
| Fusion selection + timeline | Directly delivers the next-week experiment's model-and-time visibility | Account eligibility, real phase payloads, durable attribution and client UX | Immediate successor; definition can proceed alongside upgrade qualification |

The priority is dependency-driven, not a claim that upgrading alone delivers
the experiment. A working upgrade without the timeline still fails the user's
goal; a Fusion picker on the old unqualified runtime is equally insufficient.
Do not spend the schedule exposing unrelated new SDK capabilities. If the
compatibility gate fails, report the experiment as not ready rather than silently
substituting ordinary Auto or an explicit model.

Rough scope comparison: the SDK feature spans fewer product layers but has
broader platform regression risk. Fusion spans provider events, contracts,
persistence and web/desktop/mobile presentation. No day-count estimate is
supported until exact artifact compatibility and account discovery are known.

## Sources and unresolved questions

See sibling `copilot-fusion-model-selection/analysis.md` for the detailed
immutable routing/event evidence. Shared public baseline:

- SDK release: https://github.com/github/copilot-sdk/releases/tag/v1.0.28
- npm metadata: https://registry.npmjs.org/@github/copilot-sdk/1.0.28
- Candidate source pinned at
  `fa108e71ee3025663e0dac20f2a071055d3a6b14`:
  `nodejs/src/runtimeArtifacts.ts:162-175,240-290`,
  `nodejs/src/client.ts:1706-1760,2053-2110,2692-2720,3180-3240`,
  `nodejs/src/types.ts:2395-2409,2818,2929-2943,3046`.
- Fork: `packages/provider-copilot/src/server/client.ts:1-119`,
  `adapter.ts:1204-1231,1339-1345`,
  `scripts/lib/copilot-payload.ts:11-30,75-95,145-219`,
  `scripts/lib/cli-external-packages.ts:1-7`;
  https://github.com/tesseracode/t3code/issues/34.

Unknown: tested minimum SDK/runtime, published platform payload contents,
protocol compatibility with explicit CLI overrides, account eligibility,
native-store forward/backward compatibility, runtime event completeness,
and target-platform behavior. Static analysis does not resolve these.

Follow-up qualification: exploration.md now records integrity-verified published
SDK declarations and the actual Mac arm64 payload layout/modes. Other platform
payload contents and all runtime execution gates remain unqualified. The current
adapter already uses object options on `setModel`; do not assume that call needs
an API migration merely because the candidate documentation uses that form.
