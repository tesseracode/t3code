# Feature Request: Maintain one coherent Copilot runtime packaging boundary on stable v0.0.42: exact owner-resolved dependency closure, reviewed native payload pruning, and WSL executable/cache readiness. Consolidate existing landed source without product changes; supersede historical pruning, WSL, closure and newline-fixture records while preserving their artifacts and evidence.

**Slug**: `copilot-runtime-packaging`
**Created**: 2026-09-24T19:06:30Z

## Description

Maintain one coherent Copilot runtime packaging boundary on stable v0.0.42: exact owner-resolved dependency closure, reviewed native payload pruning, and WSL executable/cache readiness. Consolidate existing landed source without product changes; supersede historical pruning, WSL, closure and newline-fixture records while preserving their artifacts and evidence.

PKG-01 (#17): build-only unsigned personal previews for Mac arm64 and Windows x64 with matching Linux x64 WSL archive. Preserve product base 982929e9323f00ded5c7ca943f22a0bcef669a6f and disclose a gated packaging-isolation overlay: distinct installer identity, dedicated T3/Electron profile, no updater feed, and no stock protocol registration. Ordinary builds remain unchanged. No signing, release/npm/deployment, provider turns or live-profile writes; max two CI attempts per target. Desktop cloud OAuth/passkeys are excluded from the isolated preview so its launch cannot claim the stock URL scheme. Retain exact dependency/payload/mode invariants and source/hash manifests.
