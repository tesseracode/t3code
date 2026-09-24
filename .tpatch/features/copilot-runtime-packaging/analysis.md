# Analysis: copilot-runtime-packaging

## Decision

Maintain Copilot payload pruning, exact dependency closure and WSL runtime
readiness as one packaging root. The maintainer approved consolidation on
2026-09-24. This adopts the existing implementation without changing product
code, package versions or upstream's artifact topology.

The closure port intentionally extends the pruning helper and its tests.
It also changes an import adjacent to the WSL archive validator. On tpatch
v0.16.0, exact reachable landing attestations and successful historical replay
do not authorize these child changes during the parent's current-tree reverse
check. The pruning postimage and WSL context checks therefore fail even though
the integrated behavior passes focused tests.

Consolidation makes the canonical patch describe the final coherent boundary.
It does not suppress verification or claim the old individual postimages
still exist. Preserve the old canonical patches, recipes, generation manifests,
landings and unsuccessful verification records as historical evidence.

## Provenance

- Stable upstream v0.0.42: `719a76ca1dbf5490f1aa33ffb9966301e02be9a9`.
- Actual pre-packaging baseline: `acd69601918506de8a86754cb2aee73cc7afb085`.
- Adopted integrated tip: `692b356e54ca8fc9c39641733ef417bc3e683202`.
- Pruning landing: `e4aaa9051dddc497739b54d0cca374c6029800aa`.
- WSL landing: `578a2add493d2654a153310aa4827eab6c7aa8b6`.
- Closure source: `fc01e75770e4b92c4a72d29cc58d612894a5a995`.
- Complete closure attestation: `77e0b48ab79995ec3d18ed1c28733ecb4ef5044e`.

The combined source range contains exactly 13 paths. Generate preimage-bearing
operations from their real committed baseline bytes, adopt through every
manual lifecycle phase, then record the complete committed range and land it.
Only after the replacement verifies, declare explicit supersedes edges to
the three packaging records and the historical newline-fixture child.

## Dependency and coverage

The native Copilot provider supplies the SDK and runtime contract. Upstream's
Windows portability invariant is satisfied by reachable commit
`0a590fa01af66ec135d2ebf2d5542b08a37dc275`. Historical packaging records are
superseded evidence, not replay prerequisites for this complete replacement.

Cover macOS/Linux desktop stages, the Windows native sidecar and standalone
CLI archives. WSL embeds the independent Linux archive unchanged; SSH and
server updates consume those archives. Web/mobile clients and other providers
receive no new behavior. Preserve no-Copilot stages, server locality and all
existing connection modes.

## Limits

The preceding focused set passed 163 tests; 14 complete Linux/WSL installer
cases skipped on macOS. Fresh Copilot-only target stages matched source
dependencies, but foreign lifecycle scripts were skipped. These observations
are not complete packaged-platform, Windows whole-app file-count or native
SDK -> CLI -> SDK continuity qualification. Those gates remain under #2.
