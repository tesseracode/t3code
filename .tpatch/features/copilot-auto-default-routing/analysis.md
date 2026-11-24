# Analysis

The native SDK accepts an advertised `auto` model without `catalog.auto` or an
explicit routing tier. The Fusion integration incorrectly suppresses that model
and rejects session creation and turn switching through its shared validator.
Missing optional tier metadata is not evidence that plain Auto is unavailable.

Correct provider discovery, validation, status copy and user documentation.
Explicit tier IDs still require enabled, visible account advertisement. Preserve
policy-disabled model filtering and explicit-model defaults. Shared provider
snapshots and validation cover web, desktop, mobile and remote environments;
no wire or other-provider changes are needed.

Record this as a hard-dependent correction leaf rather than rewriting the
Fusion parent's canonical patch or historical landing evidence. Native fixed-
anchor overlap verification remains a known limitation, not a passing gate.
