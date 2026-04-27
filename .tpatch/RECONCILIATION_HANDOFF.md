# Reconciliation Session Handoff

**Read these files in order:**
1. `.tpatch/HANDOFF.md` — repo overview, all features, dev setup
2. `.claude/instructions.md` — technical context, gotchas
3. `.tpatch/case-studies/2026-04-26-reconciliation-impact.md` — **THE KEY FILE** — per-feature impact assessment, strategy, key files to read
4. `.tpatch/tools/WORKFLOW.md` — tpatch workflow and recipe generation

## What happened
Upstream (pingdotgg/t3code) shipped 27 commits including a major refactor of the model options system (#2246) and a toast close button (#2023). Our `main` branch is synced with upstream. Our `feature/copilot-provider` branch has 51 commits with 18 features that need reconciliation.

## What to do

```bash
# 1. Verify state
tpatch status
git log --oneline main..feature/copilot-provider | wc -l

# 2. Run reconcile to get formal verdicts
tpatch reconcile --upstream-ref origin/main

# 3. Drop upstreamed feature
tpatch remove toast-close-button --force

# 4. For each feature with verdict "reapplied" — verify it works
# For each with "3WayConflicts" or "blocked" — re-implement against new upstream

# 5. The big re-implementation: copilot-cli-provider
# Read the new model.ts ProviderOptionDescriptor system
# Add "copilot" to ProviderKind, settings, all Record<ProviderKind> maps
# Adapt CopilotProvider to produce ProviderOptionDescriptor[] instead of ModelCapabilities

# 6. After each fix: typecheck, commit, record with tpatch
bun run typecheck
node .tpatch/tools/generate-recipe.cjs <slug> <base> HEAD
tpatch record <slug> --from <base>
```

## Critical: model options system changed
The old system: `CodexModelOptions { reasoningEffort }`, `ClaudeModelOptions { effort, thinking }`, per-provider types
The new system: `ProviderOptionDescriptor { id, type, options[], currentValue }`, generic array-based, provider-agnostic

Our `CopilotModelOptions`, `buildCapabilitiesFromSdkModel()`, `normalizeProviderModelOptions()` copilot cases, `TraitsPicker` copilot handling — ALL need rewriting to use the new descriptor system.

## Feature priority order for reconciliation
1. copilot-cli-provider (foundation — everything depends on it)
2. copilot-dynamic-models (model capabilities)
3. copilot-plan-compaction (permission types)
4. copilot-hide-internal-models (settings)
5. effort-theming (UI descriptors)
6. Everything else (likely clean)
