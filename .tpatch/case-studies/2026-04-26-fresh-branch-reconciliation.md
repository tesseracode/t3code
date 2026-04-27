# Case Study: Fresh Branch Reconciliation — v0.0.21

**Date**: 2026-04-26
**Duration**: ~2 hours total (research + implementation)
**Upstream**: 27 commits, major model options refactor
**Result**: ✅ All 14 features re-applied, 10/10 typecheck, 1 feature marked upstream_merged

---

## What Happened

### The Problem
Upstream v0.0.21 shipped 27 commits that rewrote the model options system from per-provider types (`CodexModelOptions`, `ClaudeModelOptions`) to a generic `ProviderOptionDescriptor` array system. Our 14 applied features, built against the old system, needed reconciliation.

### Three Approaches Tried

| Approach | Agent | Time | Result |
|----------|-------|------|--------|
| 1. `tpatch reconcile` + `--resolve` | Reconciliation agent | 1 hour | 7 blocked, 3 upstreamed (1 false positive), 0 resolved by Phase 3.5 |
| 2. Merge upstream into feature branch | Reconciliation agent | 30 min | Invalid — dropped 41 upstream files, kept old code |
| 3. **Fresh branch from main + re-apply** | Original agent | 45 min | ✅ Success — 10/10 typecheck |

### Why Approach 3 Won

**Merge-based approaches fail when the upstream refactor is structural.** When upstream replaces `ModelCapabilities { reasoningEffortLevels }` with `ModelCapabilities { optionDescriptors }`, a merge produces a tree that has EITHER the old OR the new — never both correctly integrated. The merge chose "ours," which compiled but was missing 41 upstream files.

**Fresh branch + re-apply is surgical.** You start with a known-good upstream, then add your changes one by one, adapting each to the new API surface. TypeScript catches every missing entry immediately.

### The Cross-Pollution Issue

When recording all features with `tpatch record <slug> --from main`, every feature gets the **same 137KB, 27-file patch** because all changes are in one commit. This is the cross-feature pollution problem — `--from main` captures ALL changes since main for every feature.

**This is acceptable for now** because:
- The patches work for full replay (applying any one applies all)
- Feature-scoped patches would need per-feature commits
- The recipes (when generated per-feature) are properly scoped

**For future sessions**: Make one commit per feature to get clean per-feature patches.

### What the Sub-Agents Did

Two sub-agents handled the mechanical work:

1. **Agent 1** (10min): Added `copilot` to all `Record<ProviderKind, ...>` maps, `CopilotSettings`, `ModelSelectionPatch`, session-logic, composerDraftStore, SettingsPanels, server wiring, ProviderRegistry, ProviderAdapterRegistry. Result: 9/10 typecheck (13 errors in our adapter files).

2. **Agent 2** (7min): Fixed CopilotAdapter and CopilotProvider for new upstream APIs — converted `ModelCapabilities` to `optionDescriptors` format, added `presentation` field, replaced `CodexReasoningEffort` with local type, updated option access pattern. Result: 10/10 typecheck.

**Sub-agent delegation was key** — the mechanical "add copilot to every Record<ProviderKind>" work is tedious but well-scoped. Perfect for parallel agents.

---

## Key Learnings

1. **Fresh branch > merge for structural refactors.** When upstream changes the shape of core types, merge resolution is guesswork. Fresh re-application uses the compiler as your guide.

2. **Sub-agents excel at mechanical adaptation.** "Add copilot to every Record<ProviderKind, ...>" is a perfect agent task — repetitive, well-defined, verifiable by typecheck.

3. **Cross-pollution in patches is tolerable** when you have one big re-application commit. The alternative (per-feature commits) is ideal but time-consuming.

4. **`upstream_merged` state is useful.** Marking `toast-close-button` as upstream_merged (not removed) preserves the history of what happened.

5. **The checklist validation pattern works well.** Running a quick grep-based verification against a checklist after re-application catches gaps fast.

---

## Recommendations for tpatch

| Priority | Recommendation |
|----------|---------------|
| P0 | Add `tpatch reconcile --fresh-branch <name>` mode — creates new branch from upstream, copies .tpatch/, provides feature specs as re-application context |
| P1 | Warn when `record --from` produces identical patches for multiple features (cross-pollution detection) |
| P1 | Add `--state upstream_merged` flag to `tpatch amend` for manual state setting |
| P2 | Sub-agent coordination support — "apply these 5 features in parallel on worktrees, merge results" |
