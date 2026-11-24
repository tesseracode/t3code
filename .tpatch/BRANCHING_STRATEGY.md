# Fork branching policy

The current policy is [Maintaining the T3 Code fork](../docs/internals/fork-maintenance.md).
The operating procedure is [Fork patch flow](../docs/operations/patch-flow.md).

`main` is the validated fork baseline; ordinary `tpatch/<slug>` features target
main. Newer-upstream-dependent features remain candidate-only until their
`reconcile/<upstream-tag>` baseline is promoted. Preserve pure upstream
baselines and immutable validated fork snapshots. Package qualification,
publication and installation remain separate from source/main promotion.
Each requires its own explicit approval.

The previous pre-v0.0.23 instructions are historical and remain in Git history.
Do not use their outdated lifecycle commands, commit-before-record ordering,
moving-main target, or typecheck-only release gate.
