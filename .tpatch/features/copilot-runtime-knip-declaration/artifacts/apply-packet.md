# Apply Packet: copilot-runtime-knip-declaration

## Request
# Feature Request: Teach the server workspace Knip audit that its pinned Copilot SDK is an intentional external runtime root, loaded from the emitted server location and staged into CLI/desktop artifacts. Keep the dependency, native payload safeguards, and all other dependency auditing intact. Resolve issue #41 with a narrowly scoped configuration exception and existing runtime packaging regressions.

**Slug**: `copilot-runtime-knip-declaration`
**Created**: 2026-11-05T18:35:14Z

## Description

Teach the server workspace Knip audit that its pinned Copilot SDK is an intentional external runtime root, loaded from the emitted server location and staged into CLI/desktop artifacts. Keep the dependency, native payload safeguards, and all other dependency auditing intact. Resolve issue #41 with a narrowly scoped configuration exception and existing runtime packaging regressions.


## Spec
# Acceptance

- The same server dependency audit passes without deleting the SDK dependency.
- Scope the exception only to `@github/copilot-sdk` in `apps/server`.
- Preserve source-server resolution, external closure, and native payload tests.
- Run changed-file checks; no dependency installation or packaged deployment.


## Exploration
# Scope

Add the SDK to the existing server workspace exception list in `knip.jsonc`.
Keep its disk-loaded runtime comment accurate. The existing resolver,
workspace-owned closure, and Copilot payload tests cover the packaging
boundary; do not add a test that merely repeats the JSON setting.

