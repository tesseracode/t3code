# Tracked Features

| Slug | Title | State | Compatibility |
|------|-------|-------|---------------|
| `copilot-cli-provider` | Expand the providers so that not only claude and codex are
 supported, but add the ability to use the copilot cli, as requested in
 this github issue from the upstream
 https://github.com/pingdotgg/t3code/issues/193 | applied | unknown |
| `copilot-dynamic-models` | Build model capabilities dynamically from Copilot SDK runtime data instead of static BUILT_IN_MODELS. Use supportedReasoningEfforts from client.listModels() to populate reasoningEffortLevels per model. Also investigate using copilot-api for broader model listing (44 models vs SDK's 16). | applied | unknown |
| `copilot-hide-internal-models` | Add a toggle in Copilot provider settings to hide models marked as internal-only (e.g. claude-opus-4.6-1m with Internal only in name) from the model selection list. Default off (show all). | requested | unknown |
| `copilot-plan-compaction` | Block write tools in plan mode (Fix 1), handle compaction/truncation events (Fix 3), and surface exit_plan_mode events as proposed plans. Plan mode enforcement: auto-deny write permissions when interactionMode is plan. Compaction: map session.compaction_start, session.compaction_complete, session.truncation to canonical runtime events. | applied | unknown |
| `copilot-turn-timing` | Fix Worked for X elapsed time calculation — use sendTurn() timestamp instead of SDK assistant.turn_start event timestamp for the turn.started event createdAt field. | applied | unknown |
| `custom-agents` | Add custom agent support across providers. Copilot and Claude have SDK-level support for custom agent definitions (system prompts, tool allow/blocklists, MCP servers per agent). Codex/Cursor/OpenCode need graceful degradation. Requires new contracts schema, per-adapter wiring, event handling for agent lifecycle, and UI agent selector. | requested | unknown |
| `effort-theming` | Add visual theming for high-effort modes across providers. GPT xhigh gets a distinct animated border style similar to Claude ultrathink rainbow, but with a different color palette. Driven by effort selection in the composer, not prompt injection. | applied | unknown |
| `readme-copilot-notice` | Add a section to README.md documenting the experimental Copilot provider integration, with a warning that sessions created with the Copilot provider are not backward-compatible with upstream t3code — switching back to upstream will fail to load those sessions. | requested | unknown |
| `toast-close-button` | Add an (x) close button to toast notifications in addition to the existing swipe-to-dismiss. Small clickable icon in the top-right corner of each toast. | requested | unknown |
