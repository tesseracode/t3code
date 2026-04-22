# T3 Code Fork — Session Handoff

## Handoff: T3 Code Fork — Copilot Provider Integration

**Read `.claude/instructions.md` first** — it has the full technical context for this repo.

### What this is
A fork of `pingdotgg/t3code` at `github.com/tesseracode/t3code`, branch `feature/copilot-provider`. We added GitHub Copilot as a provider using `@github/copilot-sdk`, plus several UI and build improvements.

### How we work
We use `tpatch` (v0.4.3) for fork patch management. Run `tpatch status` to see all features. Each feature has full context docs under `.tpatch/features/<slug>/` (analysis.md, spec.md, exploration.md, recipe, patch, record).

**Key workflow**: When implementing features, use **Path B** — `tpatch apply <slug> --mode started`, make changes, `tpatch apply <slug> --mode done`, `tpatch record <slug> --from <base>`. The LLM provider for `tpatch implement` produces low-quality recipes — act as the provider yourself. See the skill at `.claude/skills/tessera-patch/SKILL.md` for details.

**After changes**: always typecheck (`bun run typecheck`), commit, record with tpatch, generate recipe from diff, push.

### Current state (12 features)
- **10 applied**: copilot-cli-provider, copilot-dynamic-models, copilot-plan-compaction, copilot-turn-timing, copilot-skill-discovery, copilot-hide-internal-models, copilot-cross-platform-build, effort-theming, readme-copilot-notice, toast-close-button
- **2 backlogged**: custom-agents (cross-provider agent support), windows-wsl-support (WSL integration)

### Open items / known gaps
- **Plan mode Fix 2**: `exit_plan_mode.requested` — we surface the plan content but don't actively block the exit (no public SDK method found). Needs deeper investigation.
- **Compaction events**: Mapped but untested in production — need to verify UI shows "compacted" state.
- **Diff panel for Copilot**: Should work via CheckpointReactor but hasn't been verified — needs testing with a file-modifying Copilot turn in a git project.
- **Skill discovery**: Implemented with merge-by-name and userInvocable filtering — create a `SKILL.md` in a workspace and verify `$` autocomplete populates.
- **Toast close button**: Implemented, needs visual QA.
- **SDK version**: On `@github/copilot-sdk@0.2.2` (latest stable as of Apr 21 2026). Check for newer versions periodically.

### Dev setup
```bash
nvm use 23  # or 24 for builds (not 24 for vite dev — rolldown compat issue)
export PATH="./node_modules/.bin:$PATH"
bun install && bun run dev
```

### Upstream sync
```bash
git fetch upstream && git checkout main && git merge --ff-only upstream/main
git checkout feature/copilot-provider -- .tpatch/
tpatch reconcile --upstream-ref upstream/main
# Then act as provider to re-apply features if needed
```

### Case study feedback
Detailed tpatch feedback is at `.tpatch/case-studies/2026-04-17-copilot-provider-session.md` — includes 8 items for the tpatch maintainer.
