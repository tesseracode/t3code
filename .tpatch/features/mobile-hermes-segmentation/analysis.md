# Analysis

Physical release-build startup fails before main registration. Android's
symbolicated stack points to `packages/contracts/src/orchestration.ts:463`,
where ProjectMonogramText constructs Intl.Segmenter during module import.
Hermes lacks this constructor. The iPhone similarly remains at its launch
screen; the corrected build must establish its outcome separately.

Keep the shared grapheme validation unchanged. Supply the missing standard API
at the mobile bootstrap boundary before any contracts/app module imports.
Use the conditional @formatjs/intl-segmenter polyfill, preserving a native
implementation when available. Web, desktop and server behavior need not change.

Native packaging defects discovered alongside this are separate build inputs:
Android requires an NDK runtime exposing the fbjni C++ exception symbol, and
personal-team iOS signing requires compatible generated entitlements. Neither
justifies weakening JavaScript validation or deleting device state.
