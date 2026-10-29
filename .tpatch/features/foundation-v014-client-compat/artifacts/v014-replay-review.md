# v014 Foundation compatibility source audit

Actual base: `6c925ff7c8ad226f5535ba3464636377a292437e`. Complete cohesive compatibility root: seven product paths (five writes, two supported manual deletions), not a replacement for complete Foundation or attention canonicals. Both original canonical patches/recipes are byte-unchanged; no migration/provider/native/packaging/license-policy or ServerEnvironment changes.

## Validation

All commands below use Node 26.12.1 and this owned worktree. Initial targeted runner failed exit127; only then restored dependencies with existing Vite+ `install --frozen-lockfile` (exit0, 0 downloads, no manifest/lock changes).

- `vp run --filter @t3tools/client-runtime typecheck` before edits: exit2, reproduces missing inboundFrames and obsolete registerPlatform.
- `vp test run packages/client-runtime/src/state/attention.test.ts packages/client-runtime/src/state/commandPermissions.test.ts apps/server/src/tws/TwsCliDecoder.test.ts`: exit0, 3 files / 40 tests passed.
- `vp run --filter @t3tools/client-runtime --filter t3 typecheck`: exit0, 2 owning packages passed.
- `vp fmt --check` on the four touched TypeScript paths plus `docs/internals/tws-context.md`: exit0 after installed formatter fixed both permission test and private worker declaration.
- `vp lint --report-unused-disable-directives` on the four touched TypeScript paths: exit0.
- `knip --workspace apps/mobile --include files --no-config-hints`: exit1, Metro config cannot load because this branch lacks integrated license context; partial traversal then reports 69 platform files. Not a passing check.
- `knip --workspace apps/server --workspace packages/client-runtime --exports --preprocessor ./scripts/knip-schemas.ts --no-config-hints`: exit1, same Metro/license issue and unrelated narrowed-workspace exports changeRequestsCreatedBy / PASTED_TEXT_ATTACHMENT_THRESHOLD_BYTES. None of the three reported Foundation exports remains public, but this failed run is NOT whole-integrated Knip qualification.
- `tpatch verify foundation-v014-client-compat`: exit2, inherited ambiguous Native landing evidence; no blanket waiver. Independent Git-index replay of complete seven-path patch succeeds including both removals.

Full actual outputs are in v014-validation-transcript.txt and v014-structural-verify.txt. Primary must rerun the integrated helper after merging. No full helper/repo-wide checks, apps/dev servers, provider turns, browsers or simulators started for this root.

## Lifecycle / landing limitations

`add → analyze --manual → define --manual → explore --manual → implement --manual → apply --mode started → manual edits/git rm → apply --mode done → record --staged` captured all seven paths before any commit. Five recipe writes retain actual-base SHA256 preimages; two removals are explicitly attested because recipe schema has no delete-file operation.

Two `tpatch land --no-record` attempts failed exit1 with cannot stage path set / Git exit128, despite successful dry-run and explicit scoped Git stage preflight. Evidence is retained in v014-land-refusals.txt. Use documented record-before-ordinary-Git-commit fallback with the same four truthful tpatch trailers and Co-authored-by; do not claim a successful tpatch land.

## Per-file source inspection and hashes

- `packages/client-runtime/src/state/attention.test.ts` — Narrow mocks add failing inboundFrames/address-assertion effects, remove obsolete registerPlatform. Strict current API now typechecks.
  - base `ee4d0b2485a93cc3787cf561d3598d7df292ddbf23f3c604cc5a6a7e4d527620`; current `cb33663db917da12961566c211297b2781ade2e80f62acec007da8b6b33f30da`.
- `packages/client-runtime/src/state/commandPermissions.test.ts` — Installed formatter only; destination-scoped TWS authorization assertions unchanged.
  - base `0826deefd664c6e2cf62cea649296a991f0e797fcc06b09eb6337b33aa636ccf`; current `53fe674cc704427d40b109358626eb30e17560f1d5b69076285fab591adea60a`.
- `packages/client-runtime/src/state/attention.ts` — Private worker keeps its actual workspace-factory consumer and stable Effect span; formatter deindents the shortened declaration, no behavior removed.
  - base `07ad774c75c1faf097a225a3d0384513db93e844fb75fd7805c161f6d3cd2c20`; current `8d727d4e28c726a9617f8ca21d332e112a12262355a24a3c349fb99f76270d0a`.
- `apps/server/src/tws/TwsCliDecoder.ts` — Private version/schema implementation values still consumed by exact pinned decoder logic; exported decoder API and literal result types preserved.
  - base `276e5c4bf5aeb641d14c302ce9eb1bd18b85c3b098c3bafc1d9a7ada93ca6b24`; current `04554b82b7eb0ba7a2bccceab82e97bd594358592fc4bdcd6adc571c50118f95`.
- `docs/internals/tws-context.md` — Clarify shared public factories versus absent mobile owner/presentation/push; no fake consumers or Knip ignores.
  - base `ed14bf6bea8a5fb4e85514022395b9eaaff5a82bda25e9d7885ccd5169a09460`; current `d6ca7edf0ade24404d343d92ffc32b070a8d02c48fc6538cb496f8ec540edfba`.
- `apps/mobile/src/state/attention.ts` — Delete only unreachable, unimported app-local factory instance. Shared public client-runtime attention APIs remain and web consumes them.
  - base `9eeed4917c626acc293212efa6d3e6788593a3f19ecd9beba4a4eac517b72c3d`; current `deleted`.
- `apps/mobile/src/state/tws.ts` — Delete only unreachable, unimported app-local factory instance. Shared authenticated TWS contracts/factories remain and web consumes them.
  - base `3b6e4d6670ebd44ea1899b3fbd3224803c3c853d22157b02881516690de89d4b`; current `deleted`.
