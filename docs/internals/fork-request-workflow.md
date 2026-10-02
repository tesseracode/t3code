# Requested fork features

Keep unapproved feature intent separate from the runnable integration stack.
GitHub issues are the cross-branch backlog; a tpatch directory on a request
branch is the versioned proposal, not evidence that the feature exists.

## Registration

1. Choose and record the current integration baseline. Create
   `request/<feature-slug>` from it, not from another unapproved request.
2. Use `tpatch add --slug <feature-slug> ...`, then inspect
   `tpatch status <slug>` and `tpatch next <slug> --format harness-json`.
3. Expand `request.md` with the problem, source-verified prior art, smallest
   proposed scope, compatibility/non-goals, open decisions and evidence needed.
   Research can inform a request without advancing its lifecycle.
4. Create a GitHub issue linking the slug, branch, baseline and request file.
   Add it to the canonical backlog issue. Keep changes limited to request
   metadata and directly relevant documentation.
5. Commit the registration administratively. Do not create a fake apply recipe,
   post-apply patch, generation manifest or `tpatch land` attestation for an
   unimplemented request. Record-before-land applies to actual implementation
   patches, not to pretending a request has been applied.

By explicit maintainer choice, related provider investigations may share a
dedicated provider follow-up branch. Keep one slug/issue per independently
decidable concern and leave each lifecycle truthful.

## Evaluation and adoption

Only after approval, adopt the selected request into an implementation branch
based on the then-current integration stack. Run lifecycle phases in order:
analyze, define, explore, implement, apply, focused verification, record and land.
Do not merge every request branch or use branch presence as dependency
satisfaction.

For an already-maintained implementation root, attach approved follow-up intent
to that root or explicitly supersede/consolidate it. Avoid overlapping backend
roots and preserve historical evidence. Requests rejected as duplicates or
out-of-scope use tpatch's rejection audit rather than deleting their history.

Every implementation decision belongs in its issue. Durable shipped behavior
belongs in user/internal docs; scratch plans and raw evidence remain outside
the worktree. Request branches must not alter live user state, trigger releases
or imply platform qualification.
