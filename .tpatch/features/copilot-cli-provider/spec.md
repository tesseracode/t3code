# Specification: copilot-cli-provider

## Acceptance Criteria

1. T3 Code registers an opt-in `githubCopilot` provider backed by the official
   `@github/copilot-sdk` `1.0.8` in `copilot-cli` mode.
2. Default client options use the SDK-bundled platform runtime; explicit binary and
   `COPILOT_HOME` overrides remain per instance.
3. Provider checks report runtime version and authentication state, discover models dynamically,
   filter policy-disabled models, and expose supported reasoning effort through current option
   descriptors. Probe cleanup always stops the SDK client, preserves a start/status/auth/model
   failure when cleanup also fails, and reports cleanup-only failures explicitly.
4. V2 sessions create or resume with the SDK's native session ID, persist that ID as the strong
   native thread reference, serialize stop with event handling, treat native shutdown as terminal, discard late
   events, reject `session.resume.alreadyInUse` ownership conflicts, and keep separate adapter state
   per configured instance. Event RPC, drain, disconnect, graceful client-stop, and force-stop
   deadlines keep teardown bounded.
5. V2 provider-turn start time is captured when T3 submits the message, not from a later SDK event.
   Successful completion uses root `session.idle`, never an intermediate
   `assistant.turn_end` or foreground-only `assistant.idle`. The submitted turn
   retains its ID, running state, full usage and tool/message attribution across
   iterations and attached background work. Child idle and duplicate terminal
   events cannot complete it; explicit failure, abort and shutdown remain terminal.
   Follow-up sends are refused until completion, and independent task updates
   remain distinct. Issue #20 is maintained as a fixup of this complete root.
6. Current T3 permission answers use the native request ID and require the public SDK permission
   RPC's applied-decision receipt. False, failed, foreign, or conflicting replies cannot report
   successful delivery; identical retries reuse only an already successful receipt on that runtime.
   The SDK's `no-result` permission handler prevents duplicate SDK-owned response RPCs.
   User-input and proposed-plan flows retain SDK callback handoff, without claiming native RPC
   acknowledgement. V2 owns answer resolution and delivery metadata; the adapter does not replace
   it with stale snapshots. Approval options never advertise unsupported persistence, and identical
   plans remain valid in later turns. Unsupported rollback is a typed, explicit error.
   Ownership transfers before waiting for a receipt: root idle, teardown, and snapshots cannot
   republish answered requests as pending/cancelled or overwrite their answer/delivery metadata,
   including after false/error receipts. Identical in-flight replies share the native attempt;
   conflicting replies remain refused.
7. Assistant, reasoning, tool, native tool-backed commands, hook, task/subagent,
   automatic compaction/truncation, skill, MCP, and context-usage events map to current
   `ProviderAdapterV2Event` contracts. Event processing is
   ordered, streaming whitespace is preserved, agent-scoped messages stay out of the root
   transcript, successful subagent completion retains its latest real response, usage accumulates
   every root model call per turn, compaction reaches V2 compaction items and context snapshots,
   and native task ownership remains attached to its originating run after the root becomes idle.
   Tool-only empty assistant messages produce no empty timeline rows, including native transcript
   import; real streamed whitespace remains intact.
   Explicit manual compaction, native rollback, and native forks are unsupported rather than
   simulated with conversation-file edits or a text prompt.
8. Tool arguments/results and raw provenance are bounded and redact credential-shaped argument
   fields. Binary asset bytes are never copied into canonical activity payloads.
9. Copilot skills are discovered per session and published through V2 workspace snapshots.
   Cold workspace scans use the SDK's metadata-only `skills.discover` RPC with the requested cwd;
   they do not create native sessions or load project MCP servers. The instance-wide snapshot
   contains no project skills, and personal/plugin/builtin filtering never hides project skills
   from that project's picker.
10. Provider-owned commit, PR, branch, and thread-title generation disables tools, skills, MCP,
    project config, custom instructions, extensions, and infinite sessions; malformed/oversized
    output fails, cleanup always runs, and hidden native generation sessions are deleted.
    Session creation, disconnect, deletion, graceful client stop, and force stop have independent
    deadlines; any stalled creation or graceful cleanup stage invokes bounded force stop without
    replacing the original generation failure or cleaning the same session twice. Startup,
    creation, and send interruption run the same idempotent uninterruptible finalizer while
    preserving interruption as the primary outcome.
11. Web settings/model pickers and mobile provider icons treat GitHub Copilot as active and use the
    existing Copilot glyph.
12. Legacy `providers.copilot` and `providerInstances.*.driver = "copilot"` configurations decode,
    preserve existing instance IDs/config, and run through `githubCopilot`.
    The built-in `githubCopilot` slot uses the ordinary default-instance registry.
    Legacy conversation identity migration is best-effort; fresh native sessions are accepted,
    but same-version native resumes must retain their native session and refuse concurrent owners.
13. The lockfile is regenerated with pnpm. Desktop/server staging retains the SDK and its native
    dependency closure outside the bundle so target platform packages remain resolvable.
14. Focused core tests cover client options, provider/model status, migration, create/resume/stop,
    permissions/user input/plans, critical runtime events, text generation, and workspace isolation.
    Packaging closure and real provider-turn continuity remain separate integration gates.
15. On v0.1.3, the provider package uses shared identity stamping and maintenance resolution,
    accepts current structured custom model settings, and preserves linked-context
    title generation/refinement and upstream project-settings folding. Upstream V2 owns queueing,
    delegation, and portable handoffs; the native adapter does not introduce an orchestrator.
16. Node single-executables load the external SDK through `createRequire` with no
    file-backed ESM imports. Electron and standalone hosts resolve the native target
    executable without respawning T3; explicit runtime/connection overrides win.
    Missing SDK/runtime payloads produce typed initialization/status failures.

Full packaged Windows/Linux/WSL qualification, exact all-stage dependency closure
and payload pruning remain integration gates on the dependent maintenance roots.
Focused mocked session tests and a no-inference runtime handshake do not substitute
for the later real SDK/native-CLI session-continuity gate.

## Non-Goals

- skill management controls
- provider-neutral rich resource UI
- custom agents
- tool-result fetch APIs
- WSL changes
- animated effort presentation
