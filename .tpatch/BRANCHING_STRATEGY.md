# Fork branching policy

The current policy is [Maintaining the T3 Code fork](../docs/internals/fork-maintenance.md).

`main` is integration; `tpatch/<slug>` targets main or its explicitly named
active reconciliation; `reconcile/<upstream-tag>` composes a pinned stable;
`release/<fork-version>` qualifies a frozen candidate. Publication and promotion
require explicit approval.

The previous pre-v0.0.23 instructions are historical and remain in Git history.
Do not use their outdated lifecycle commands, commit-before-record ordering,
moving-main target, or typecheck-only release gate.
