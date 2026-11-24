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
