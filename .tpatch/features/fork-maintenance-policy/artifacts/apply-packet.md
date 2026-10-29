# Apply Packet: fork-maintenance-policy

## Request
# Feature Request: Document the approved fork integration, feature, reconciliation and candidate-release branch targets, exact replay accounting, and visual/behavioral reviewer gates. Preserve upstream defaults and require explicit production promotion.

**Slug**: `fork-maintenance-policy`
**Created**: 2026-10-29T07:30:53Z

## Description

Document the approved fork integration, feature, reconciliation and candidate-release branch targets, exact replay accounting, and visual/behavioral reviewer gates. Preserve upstream defaults and require explicit production promotion.


## Spec
# Specification

Document one contributor-wide branch/release model in
`docs/internals/fork-maintenance.md`, with exact source replay, lifecycle,
visual proof, reviewer, candidate, migration and promotion boundaries.

No automatic main promotion, release publication, historical branch deletion,
or production workflow execution follows from documenting this policy.
Retain old audit history while redirecting obsolete active guidance.


## Exploration
# Exploration

The branch inventory found that replayed roots already contain the TWS,
attention, provider, search and packaging work from historical phase branches.
The mobile bootstrap is a separate root already applied in the mobile candidate.

`.tpatch/BRANCHING_STRATEGY.md` contains obsolete pre-v0.0.23 guidance and invalid
current CLI examples. Replace its active guidance with a pointer to the durable
document, preserving its previous bytes in Git history. Administrative tpatch
metadata is distinct from canonical product/policy patch scope.

