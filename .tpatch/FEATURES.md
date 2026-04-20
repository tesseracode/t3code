# Tracked Features

| Slug | Title | State | Compatibility |
|------|-------|-------|---------------|
| `copilot-cli-provider` | Expand the providers so that not only claude and codex are
 supported, but add the ability to use the copilot cli, as requested in
 this github issue from the upstream
 https://github.com/pingdotgg/t3code/issues/193 | applied | unknown |
| `copilot-dynamic-models` | Build model capabilities dynamically from Copilot SDK runtime data instead of static BUILT_IN_MODELS. Use supportedReasoningEfforts from client.listModels() to populate reasoningEffortLevels per model. Also investigate using copilot-api for broader model listing (44 models vs SDK's 16). | applied | unknown |
| `copilot-plan-compaction` | Block write tools in plan mode (Fix 1), handle compaction/truncation events (Fix 3), and surface exit_plan_mode events as proposed plans. Plan mode enforcement: auto-deny write permissions when interactionMode is plan. Compaction: map session.compaction_start, session.compaction_complete, session.truncation to canonical runtime events. | requested | unknown |
| `effort-theming` | Add visual theming for high-effort modes across providers. GPT xhigh gets a distinct animated border style similar to Claude ultrathink rainbow, but with a different color palette. Driven by effort selection in the composer, not prompt injection. | applied | unknown |
