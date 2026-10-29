# Specification: Foundation v014 client compatibility

## Scope and dependencies

Hard parent: `phase1-foundation`. This root corrects source compatibility and
dead app-local scaffolding only; the existing complete Foundation and attention
patches remain canonical and byte-unchanged.

Complete product scope:

1. `packages/client-runtime/src/state/attention.test.ts`: conform the strict
   mock to actual `RpcSession` and `EnvironmentRegistry` APIs. Unexpected liveness
   and address-assertion access must still fail explicitly.
2. `packages/client-runtime/src/state/commandPermissions.test.ts`: format only,
   retaining destination-scoped TWS authorization assertions.
3. `packages/client-runtime/src/state/attention.ts`: make the internal worker
   private while retaining the public workspace/state APIs and their consumers.
4. `apps/server/src/tws/TwsCliDecoder.ts`: make implementation constants private,
   preserving exact version/report-schema validation and exported decoder types.
5. `apps/mobile/src/state/attention.ts` and `apps/mobile/src/state/tws.ts`: remove
   only unreachable app-local factory instances; no caller or runtime behavior
   existed. Shared exported client-runtime factories remain the correct mobile
   integration boundary when a real owner exists.
6. `docs/internals/tws-context.md`: accurately describe that boundary without
   implying active mobile presentation or removing contract support.

## Acceptance

- Focused client-runtime attention and permission tests pass.
- Focused pinned TWS decoder tests pass unchanged.
- Owning client-runtime package typecheck passes with no obsolete mock APIs.
- Scoped formatter/lint checks pass, and workspace-scoped Knip reports none of
  the identified unused files/exports without ignores or artificial consumers.
- Full compatibility canonical patch includes all seven paths, including the
  two removals. Recipe write operations use genuine current-HEAD preimages;
  removals use the supported manual-apply + `git rm` path because the recipe
  schema intentionally has no delete-file operation.
- Prior failed validation/reconcile evidence remains honest; no full helper,
  repo-wide check, app server, provider turn, browser or simulator is started.
- Complete current Foundation/attention canonical bytes and upstream migration
  manifests remain unchanged.

## Explicit dead-scaffolding disposition

The removed mobile files were neither application entrypoints nor imported by
any reachable mobile module. Keeping inert exports with no owner or inventing
a mobile subscriber solely to silence Knip would imply behavior that does not
exist and potentially start unnecessary multi-environment subscriptions. Shared
public factories and authenticated wire support are preserved, not hidden behind
an ignore rule. No shipped mobile feature is removed.
