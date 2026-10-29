# Apply Packet: copilot-sdk-license-notice

## Request
# Feature Request: Supply the MIT notice omitted by @github/copilot-sdk 1.0.8 using the existing third-party package override and authoritative v1.0.8 license attribution. Restore web/mobile notice generation without bypassing validation or changing provider/runtime behavior.

**Slug**: `copilot-sdk-license-notice`
**Created**: 2026-09-23T05:22:34Z

## Description

Supply the MIT notice omitted by @github/copilot-sdk 1.0.8 using the existing third-party package override and authoritative v1.0.8 license attribution. Restore web/mobile notice generation without bypassing validation or changing provider/runtime behavior.


## Spec
# Specification: Copilot SDK notice

1. The existing notice configuration matches only `@github/copilot-sdk` 1.0.8.
2. Generate its MIT notice with `Copyright GitHub, Inc.` and link the pinned
   upstream LICENSE. Preserve strict validation for other packages/versions.
3. The real web production build completes and its generated notice manifest
   contains the SDK's MIT notice and attribution.
4. Use the shared notice pipeline used by web/mobile; no client-specific copy
   or generated asset committed just to make the build pass.
5. Provider behavior, dependency versions, runtime packaging and user state
   remain unchanged. Keep the source change separate from session search.


## Exploration
# Exploration: Copilot SDK notice

`third-party-licenses.config.json` already has `packageOverrides` using
`generatedNotice` for npm packages that omit license files.
`scripts/lib/third-party-licenses.ts` matches exact name/version before general
overrides and uses the existing generated SPDX MIT text.

Add one version-scoped override with verified attribution. Run the existing
notice-generator tests and the actual web build; inspect its generated manifest.
No new helper, test runner, dependency or production code is needed.

