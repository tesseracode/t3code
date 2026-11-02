# Analysis

The historical packaging root cannot be certified against the current provider:
its oldest replay anchor predates the provider's dependency sorting, and later
workflow/documentation edits changed its postimage. Re-recording under the old
slug leaves two forward-applicable landings with different normalized identities.
The failed attempt is retained as generation 16, not silently discarded.

tpatch v0.17.0 does not change anchor selection or provide cross-base repair.
Use native supersession to retain the old root and its evidence while giving the
complete current root an unambiguous replay identity. The replacement keeps a
hard dependency on the current provider; the SDK's packaging prerequisite moves
to this replacement, never to a soft or omitted edge.
