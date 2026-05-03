# Branching Strategy for Fork Management

## Current State
```
upstream/main (ada410bc, v0.0.21) ← our upstream tracking ref
         │
         └── main (ada410bc) ← synced with upstream, clean base
              │
              └── feature/copilot-provider-v2 (6460e521) ← ALL our features, typechecks ✅
```

**Old branches (archive, do not use):**
- `feature/copilot-provider` — pre-v0.0.21, based on old upstream
- `reconciliation/v0.0.21-assessment` — invalid merge, case study data only

## Strategy: `main` = Our Fully-Featured Fork

### The principle
`origin/main` should be our **production-ready fork** — upstream + all applied features. This is what we build, test, and deploy from.

`upstream/main` (the remote) tracks the upstream project. We never push to it.

### Workflow

**Normal development:**
```bash
# Work on feature/copilot-provider-v2 (or any feature branch)
git checkout feature/copilot-provider-v2
# Make changes, typecheck, commit
git push origin feature/copilot-provider-v2
# When ready, merge into main:
git checkout main
git merge feature/copilot-provider-v2
git push origin main
```

**When upstream releases a new version:**
```bash
# 1. Fetch upstream
git fetch upstream

# 2. Create a reconciliation branch from upstream
git checkout -b reconcile/v0.0.22 upstream/main

# 3. Copy tpatch metadata
git checkout main -- .tpatch/ .claude/

# 4. Re-apply features (Option A: fresh branch approach)
# Copy our new files (CopilotAdapter, CopilotProvider, etc.)
# Add copilot to all Record<ProviderKind, ...>
# Adapt to any new upstream API changes
# TypeScript guides you — compile errors show exactly what's missing

# 5. Typecheck
bun run typecheck  # must be 10/10

# 6. Merge into main
git checkout main
git merge reconcile/v0.0.22
git push origin main

# 7. Delete the reconciliation branch
git branch -d reconcile/v0.0.22
```

**Key rules:**
1. **Never merge upstream directly into main** — always use a reconciliation branch
2. **Never rebase main** — it's the stable production ref
3. **Feature branches branch from main** — they include our customizations
4. **tpatch reconcile runs on the reconciliation branch** — not on main
5. **Main is always deployable** — if typecheck passes, it's good

### Applying this now

```bash
# Make main point to our fully-featured v2 branch
git checkout main
git merge feature/copilot-provider-v2
git push origin main
```

After this:
```
upstream/main (ada410bc) ← upstream tracking, read-only
main (merged v2) ← our production fork, all features
```

### Future upstream sync
```
upstream/main (new commits)
         │
         └── reconcile/v0.0.22 ← fresh from upstream, re-apply features here
              │
              └── main (merge reconcile when ready)
```
