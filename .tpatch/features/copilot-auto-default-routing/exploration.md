# Integration points

`status.ts` materializes the shared provider catalog and missing-tier message.
`routing.ts` is the common validator used by `adapter.ts` for create/resume and
turn-time model switching. Plain Auto returns no tier, so existing SDK lowering
already omits `capi.autoTier` and setter `autoTier`; no adapter changes are needed.

`status.test.ts`, `routing.test.ts` and `adapter.test.ts` provide focused behavioral
coverage. `docs/user/providers-copilot.md` describes selection and availability.
All clients consume the shared snapshot; no separate client-picker patch is
needed for this eligibility correction. Fusion picker redesign is separate.
