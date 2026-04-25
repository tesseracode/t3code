# tpatch Case Study: Taking Over windows-wsl-support Mid-Flight

**Repo:** tesserabox/t3code (fork of pingdotgg/t3code)
**Feature:** `windows-wsl-support`
**Context:** The feature was already registered, partially implemented, and already in `applied` state with an older recorded patch. New work was added later on top of an otherwise dirty branch.

---

## 1. Proposed Methodology vs Skill Guidance

The proposed workflow was:

1. `tpatch apply <slug> --mode started` / "start manual"
2. commit the feature changes
3. `tpatch apply <slug> --mode done` / "stop manual"
4. `tpatch record <slug> --from <new-commit>~1`
5. generate the recipe from the recorded changes
6. add descriptions
7. commit the tpatch metadata
8. run `tpatch status`

The skill and repo guidance say:

1. always run `tpatch status <slug>` and `tpatch next <slug>` first
2. use Path B for manual work when the agent is acting as the provider
3. use `tpatch apply <slug> --mode started` and `--mode done` only while the feature is actually in the implementing/apply portion of the state machine
4. prefer `tpatch record <slug>` before commit on a clean tree, or use `--from <base>` if the code is already committed
5. generate the recipe after record, then commit the metadata separately

So the two procedures are mostly the same in intent, but not identical in control points.

---

## 2. Where They Match

- Both approaches are Path B workflows: the agent authors the change and tpatch records it after the fact.
- Both approaches isolate the implementation commit from the metadata commit.
- Both approaches use `record --from <commit>~1` as the practical way to package already-committed work.
- Both approaches rely on a post-record recipe generation step because Path B does not naturally produce a high-quality recipe.

These common points are the useful core of the workflow. For a takeover session, the commit-bounded diff is especially valuable because it gives an explicit patch boundary even when the working tree is noisy.

---

## 3. Where They Differ

### A. `status` / `next` first vs inferred next step

The skill explicitly says to ask tpatch for the current state before doing anything. The proposed workflow jumps directly to `apply --mode started`.

**Good in the skill:** it prevents moving the feature backwards or re-entering the wrong phase.

**Bad in the proposed flow:** it assumes the feature is still in the apply phase.

For this feature, `tpatch status windows-wsl-support` showed the feature was already `applied`, and `tpatch next windows-wsl-support` said the next step was `tpatch test windows-wsl-support`. Re-running `apply --mode started` here would have been state-machine drift, not progress.

### B. `apply --mode started/done` on an already-applied feature

The repo workflow doc shows `apply --mode started` and `--mode done` as the normal Path B pair while a feature is being implemented. That is correct for a fresh or currently-implementing feature.

**Good in the proposed flow:** it creates an explicit implementation session boundary.

**Bad in this takeover:** the feature was no longer in that phase. The right move was to treat the new work as an update to an already-applied feature and re-record it from the new commit boundary.

### C. commit before record

The skill prefers `record` before commit on a clean tree. The proposed flow commits first, then records with `--from`.

**Good in the proposed flow:** for takeover work on a dirty branch, it is safer and more auditable. The commit becomes the source of truth.

**Bad in the proposed flow:** it depends on contiguous feature commits. If unrelated feature commits are interleaved, `record --from <base>` can still capture the wrong range unless you also verify file scope.

**Good in the skill default:** the patch is captured directly from the working tree without needing a commit boundary.

**Bad in the skill default for this scenario:** it assumes the working tree is clean enough to be authoritative. That was not true here.

### D. "manual" wording on `apply`

The manual flag belongs to `analyze`, `define`, `explore`, and `implement`. For `apply`, the meaningful flags are `--mode started`, `--mode execute`, and `--mode done`.

So the user shorthand of "start --manual / stop --manual" captured the intent, but not the exact CLI surface.

---

## 4. What Happened in Practice

The actual successful workflow for this takeover was:

1. `tpatch status windows-wsl-support`
2. `tpatch next windows-wsl-support`
3. notice the feature was already `applied`, so do **not** re-enter `apply --mode started/done`
4. make a feature-only implementation commit
5. run the feature test command directly in PowerShell
6. run `tpatch record windows-wsl-support --from <implementation-commit>~1`
7. regenerate the recipe with `node .tpatch/tools/generate-recipe.cjs windows-wsl-support <implementation-commit>~1 HEAD`
8. verify recorded patch headers against the implementation commit file list
9. fix metadata descriptions and write the case study
10. commit only the feature metadata

This ended up being the right adaptation for an already-started feature.

---

## 5. New Findings From This Takeover

### A. `tpatch test` is currently shell-broken on Windows

`tpatch test windows-wsl-support` failed with:

```text
exec: "sh": executable file not found in %PATH%
```

The configured command itself was valid. Running `bun run test:windows-wsl-support` directly in PowerShell passed.

**Implication:** on Windows, a failed `tpatch test` can currently mean the wrapper is broken, not the feature tests.

### B. `record --from` produced a clean patch, but a polluted summary

The recorded `post-apply.patch` contained the correct 18 feature files from the implementation commit. However, the generated summary in `record.md` / `post-apply-diff.txt` reflected the broader dirty working tree before manual correction.

**Good:** the authoritative patch itself was correct.

**Bad:** the human summary was misleading until fixed.

**Implication:** for takeover work on a dirty branch, you must verify both the patch headers and the summary output.

---

## 6. Recommended Takeover Workflow

For a feature that is already started or partially recorded, the best workflow is:

1. `tpatch status <slug>`
2. `tpatch next <slug>`
3. if the feature is already `applied`, do not re-run `apply --mode started/done` unless you intentionally reopen or re-stage the feature
4. make a feature-only code commit
5. validate the feature directly; if `tpatch test` is wrapper-broken on the host OS, record that separately
6. `tpatch record <slug> --from <feature-commit>~1`
7. generate the recipe from the same commit range
8. compare patch headers against `git diff --name-only <feature-commit>~1..HEAD`
9. correct any polluted summaries
10. commit only the tpatch metadata

This is close to the user's proposed methodology, but stricter about respecting the existing feature state and stricter about verifying summary pollution.

---

## 7. Overall Evaluation

The proposed methodology and the skill describe the same underlying Path B workflow, but at different levels of rigor.

- The proposed methodology is pragmatic and works well for takeover sessions because it anchors everything to an explicit feature commit.
- The skill is better about state discipline because it forces `status` / `next` before action.
- The repo's generate-recipe step remains necessary and useful; it fills a real Path B gap.
- For already-applied features, the safest hybrid is: **skill-first state check, proposed-flow commit boundary, then record/generate/metadata commit**.

That hybrid is the best match for incomplete features that are resumed later on a branch with unrelated churn.