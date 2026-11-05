# Acceptance

- Show a compact secondary fold control immediately above a settled terminal
  response only when the primary control is not visible.
- Reuse the primary label, expansion state, deferred-loading behavior, and fold
  key. Count existing hidden entries as earlier items, not only prose messages.
- Either control expands/collapses the same fold. The lower toggle preserves the
  reader's position at the final message, including away from the list end.
- A visible primary suppresses the duplicate; virtualization and thread changes
  do not leave stale visibility behind.
- Keep existing membership tests unchanged. Add one focused browser interaction
  regression that fails before the fix, plus isolated real-client evidence.
- Record surgical product paths before commit; run focused tests and
  changed-file checks. No native/mobile changes, paid turns, or deployment.
