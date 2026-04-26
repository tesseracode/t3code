# Knowledge Transfer: tpatch Expert Context

You are taking over as the expert on this fork. Here's everything I learned across 3 weeks, 51+ commits, 18 features, 2 upstream syncs, and 1 cross-platform handoff.

## CRITICAL UPDATE (2026-04-26)

**The `reconciliation/v0.0.21-assessment` branch is INVALID.** It merged upstream but dropped 41 upstream files (builtInProviderCatalog.ts, composerProviderState.tsx, migration 026, etc.). It typechecks but is semantically incomplete — it has our old code without upstream's new features.

**The correct approach is Option A: fresh branch from main + re-apply each feature from spec.** See `.tpatch/case-studies/2026-04-26-reimplementation-case-study.md` for details.

**The "upstreamed" verdict for copilot-cli-provider is a FALSE POSITIVE.** Upstream did NOT add Copilot. Do not drop this feature.

**Actual re-implementation count: 3 features** (not 5):
1. `copilot-cli-provider` — model capabilities must use new `ProviderOptionDescriptor` format
2. `copilot-dynamic-models` — same
3. `effort-theming` — must use new `composerProviderState.tsx` instead of old `composerProviderRegistry.tsx`

The other 10 applied features survive as-is (adapter-internal, build scripts, readme, desktop WSL).

## Read These Files First
1. `.tpatch/RECONCILIATION_HANDOFF.md` — current situation (upstream v0.0.21 broke 5 features)
2. `.tpatch/case-studies/2026-04-26-reconciliation-impact.md` — per-feature impact assessment
3. `.tpatch/case-studies/2026-04-26-reconciliation-notes.md` — lessons learned, assumption gaps
4. `.claude/instructions.md` — technical context for this repo
5. `.tpatch/tools/WORKFLOW.md` — our proven Path B workflow + recipe generation script

## Core Lessons

### tpatch Workflow That Works
```
tpatch add --slug <name> "description"
tpatch apply <slug> --mode started
# Make ALL code changes
bun run typecheck
tpatch apply <slug> --mode done
git add <files> && git commit -m "feat: ..."
tpatch record <slug> --from <parent-commit>
node .tpatch/tools/generate-recipe.cjs <slug> <parent> HEAD
git add .tpatch/ && git commit -m "chore: record <slug>"
```

**Never use Path A** (LLM implement). It produces garbage recipes 90%+ of the time. Always use Path B (you-as-provider).

### Recipe Schema
The CLI uses `"type"` not `"op"` for operations. The skill file was wrong in v0.4.3 (fixed in v0.5.1). Always use:
```json
{ "type": "replace-in-file", "path": "...", "search": "...", "replace": "..." }
{ "type": "write-file", "path": "...", "content": "..." }
```

### Reconciliation Gotchas (learned the hard way)
1. **Never merge upstream INTO the feature branch** — it destroys patch applicability. Rebase or reconcile on clean main.
2. **"Upstreamed" verdicts are unreliable** — the LLM hallucinated that Copilot was upstreamed when upstream only added Cursor/OpenCode. Always verify.
3. **"Blocked" ≠ "broken"** — 3/7 "blocked" features had their code fully present in the tree. tpatch confused "patch can't apply" with "feature is broken."
4. **`--resolve` fails when merge blobs are missing** — 0/7 could use Phase 3.5 in our reconciliation.
5. **FEATURES.md doesn't auto-update** on `apply --mode done` or `record`. It catches up lazily.

### Cross-Feature File Conflicts
Multiple features modify `CopilotAdapter.ts`. When recording:
- `tpatch record --from <base>` captures ALL changes since base, including other features
- Use scoped recording: `git diff <base>..HEAD -- file1.ts > post-apply.patch`
- Or scope the recipe: `node .tpatch/tools/generate-recipe.cjs <slug> <base> HEAD -- file1.ts`

### Provider Integration Patterns
When adding a new provider (like Copilot) to t3code:
1. Every `Record<ProviderKind, ...>` must include the new provider (TS enforces at compile time)
2. `normalizeProviderKind()` in `composerDraftStore.ts` is a runtime gate — missing providers silently fail (clicks do nothing)
3. The old `TraitsPicker.tsx` per-provider effort handling has been **replaced** with generic `ProviderOptionDescriptor` arrays as of upstream v0.0.21
4. The old `ModelCapabilities` with `reasoningEffortLevels` is **gone** — replaced by `optionDescriptors` on model capabilities

### The New Upstream Model Options System (v0.0.21)
**This is critical for re-implementing our features:**

Old system (what our features target):
```typescript
CodexModelOptions { reasoningEffort: "low"|"medium"|"high"|"xhigh" }
ClaudeModelOptions { effort, thinking, fastMode, contextWindow }
CopilotModelOptions { reasoningEffort } // we added this
```

New system (what upstream uses now):
```typescript
ProviderOptionDescriptor { id, type: "select"|"boolean", options[], currentValue }
ProviderOptionSelection { id, value: string|boolean }
ModelCapabilities { optionDescriptors?: ProviderOptionDescriptor[] }
```

The model options are now **generic arrays**, not per-provider types. To add Copilot model options, you create `ProviderOptionDescriptor` entries describing the available options (effort levels, etc.) — the UI auto-renders them via the generic TraitsPicker.

### Key Files (Post-v0.0.21)
| File | What it does now |
|------|-----------------|
| `packages/contracts/src/model.ts` | `ProviderOptionDescriptor`, `ProviderOptionSelection`, `ModelCapabilities` |
| `packages/contracts/src/orchestration.ts` | `ProviderKind` (need to add `"copilot"`) |
| `packages/contracts/src/settings.ts` | Per-provider settings (need to add `CopilotSettings`) |
| `apps/web/src/components/chat/composerProviderState.ts` | Replaced `composerProviderRegistry.tsx` |
| `apps/web/src/components/chat/TraitsPicker.tsx` | Generic descriptor-based, no per-provider code |
| `apps/server/src/provider/builtInProviderCatalog.ts` | NEW — built-in model definitions |
| `apps/server/src/provider/providerSnapshot.ts` | Rewritten — builds provider snapshots |

### Copilot SDK
- Currently on `@github/copilot-sdk@0.3.0` (the Windows agent upgraded from 0.2.2)
- SDK permission types changed in 0.3.0 — `PermissionRequestResult` kinds are now `approve-once`, `approve-for-session`, `reject` (not the old `approved`/`denied-interactively-by-user`)
- `session.rpc.skills.list/enable/disable/reload` are `@experimental`
- `enableConfigDiscovery: true` enables auto-discovery of skills, MCP, agents
- `infiniteSessions` defaults to enabled (auto-compaction at 80% context)

### What Needs Re-Implementation
The 5 features that need adaptation to the new upstream:
1. **copilot-cli-provider** — Add `"copilot"` to `ProviderKind`, `CopilotSettings`, all `Record<ProviderKind>` maps, web components. Use new `ProviderOptionDescriptor` for model capabilities.
2. **copilot-dynamic-models** — `buildCapabilitiesFromSdkModel()` must return `{ optionDescriptors: [...] }` instead of the old `{ reasoningEffortLevels: [...] }`.
3. **copilot-plan-compaction** — Permission types changed. `denied-interactively-by-user` → `reject`. Plan mode check logic is the same.
4. **copilot-hide-internal-models** — Re-add `CopilotSettings.hideInternalModels` to new settings schema. UI toggle in SettingsPanels needs new provider card structure.
5. **effort-theming** — xhigh detection needs new descriptor-based approach (check `primarySelectDescriptor` value instead of old `promptEffort === "xhigh"`).

### Testing
```bash
nvm use 23  # or 24 for builds
export PATH="./node_modules/.bin:$PATH"
bun install && bun run typecheck  # 9 packages must pass
bun run dev  # starts server + web on localhost:5733
```

### Git Setup
```
origin: https://github.com/tesseracode/t3code.git
upstream: https://github.com/pingdotgg/t3code.git
main: synced with upstream/main (v0.0.21)
feature/copilot-provider: our feature branch (51 commits)
reconciliation/v0.0.21-assessment: reconciliation agent's work
```
