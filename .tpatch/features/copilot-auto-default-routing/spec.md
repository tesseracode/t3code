# Restore plain Copilot Auto routing

- Keep advertised, policy-enabled Auto in the model catalog when routing-tier
  metadata is absent; do not manufacture a Routing option.
- An Auto selection with no explicit tier leaves native routing preferences
  untouched and succeeds without metadata, during creation, resume and switching.
- Explicit Auto/Fusion tier requests still reject missing metadata, unknown,
  hidden and policy-disabled tiers, and tiers on explicit models.
- Do not introduce Auto when neither its model nor routing metadata is advertised.
- Missing-tier status text distinguishes ordinary models from explicit routing
  preferences. User documentation reflects that distinction.
- Focused discovery, routing and adapter regressions cover the correction.
- Retain the Fusion parent and historical evidence; no SDK bump or deployment.
