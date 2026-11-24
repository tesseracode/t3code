# Analysis

The fork has an existing policy, but does not explicitly preserve separate
pure-upstream and validated-fork references or define how concurrent main
features reach a reconciliation candidate before promotion. Older handoff
instructions also describe moving upstream main rather than a pinned release.

Extend the current policy and add an operations guide, rather than introduce
a competing authority. Main promotion must preserve semantic coverage and
both histories. The approved historical verifier exception is limited to exact
independent replay proof, not malformed attestations or real replay failures.
Package execution and live migration are separate gates from source acceptance.

This change affects maintainer procedures only. It does not modify runtime
behavior, current feature compatibility, branch refs, installations or secrets.
