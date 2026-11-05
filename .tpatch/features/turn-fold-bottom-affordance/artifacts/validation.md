# Validation

The new browser interaction regression failed against the unchanged source
because the lower control did not exist. It now checks both toggles, the hidden
count, visibility suppression, returning to the primary row, and final-message
anchoring within two CSS pixels while a later turn follows the one being read.
Existing fold-membership tests are unchanged.

`tpatch verify turn-fold-bottom-affordance` passes every blocking check,
including surgical-recipe and canonical-patch replay. Record warns that the
older `session-search` feature whole-file-owns these paths; its historical
artifacts are preserved rather than rewritten by this independent feature.

Final `vp run check:changed cdfe568280` passes formatting, lint, both Knip passes,
two affected-package typechecks, and 123 tests across the timeline's three
adjacent test files. The same 123-test focused selection also passes separately.
The existing test runner's missing Chromium binary was installed only after the
runner reported it missing; no dependencies or manifests changed.

## Real-client reproduction

An isolated ACP replay emitted two interim reports, two read activities, a
50-step markdown plan, and a final response. It used no paid provider or real
file operations. The initial fixture attempt was cancelled by an automatic
dev-server restart; the explicitly resubmitted replay completed without
provider errors.

- Baseline at 960 x 900 CSS pixels: expanded plan pushed the primary fold to
  -4518 pixels; the final response remained visible with no secondary control.
- Qualified source at 639 x 900 and 960 x 900: the lower control displays the
  same duration and four earlier hidden items. A visible primary at 244 pixels
  suppresses it entirely.
- At 639 pixels, expanding and collapsing from below each preserved the final
  row at exactly 620 pixels. The controls shared `aria-expanded` and the earlier
  report became reachable without moving the final reply.
- Before/after PNGs and a toggle recording are retained privately as
  `daytime-fold-before.png`, `daytime-fold-after.png`, and
  `daytime-fold-toggle.mp4`. No screenshots or local workspace paths are
  committed or uploaded.

Only the existing web timeline changed; desktop and guest rendering share it.
Native mobile, fold membership, provider behavior, and persistence are unchanged.
No live profile, installed app, deployment, or main branch was modified.
