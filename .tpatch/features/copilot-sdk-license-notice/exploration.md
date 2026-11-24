# Exploration: Copilot SDK notice

`third-party-licenses.config.json` already has `packageOverrides` using
`generatedNotice` for npm packages that omit license files.
`scripts/lib/third-party-licenses.ts` matches exact name/version before general
overrides and uses the existing generated SPDX MIT text.

Add one version-scoped override with verified attribution. Run the existing
notice-generator tests and the actual web build; inspect its generated manifest.
No new helper, test runner, dependency or production code is needed.
