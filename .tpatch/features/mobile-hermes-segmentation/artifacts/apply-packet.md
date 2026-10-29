# Apply Packet: mobile-hermes-segmentation

## Request
# Feature Request: Make native mobile startup compatible with Hermes while preserving Unicode grapheme validation.

**Slug**: `mobile-hermes-segmentation`
**Created**: 2026-10-03T13:51:55Z

## Description

Make native mobile startup compatible with Hermes while preserving Unicode grapheme validation.


## Spec
# Specification

1. Load a conditional Intl.Segmenter polyfill at mobile entry before App and
   transitive contract modules, on both iOS and Android.
2. Preserve a native Segmenter when present.
3. Importing contracts without a native Segmenter succeeds; ProjectMonogramText
   retains its two-grapheme limit, combining-mark handling and existing syntax
   restrictions. Do not substitute code-point or UTF-16 splitting.
4. Pin the mobile dependency and regenerate the normal lockfile. No server,
   desktop, web schema or provider behavior changes.
5. Focused tests cover the absent-native API and native-preservation cases.
   Physical bundled builds must get past bootstrap without relying on Metro.
6. Preserve all phone apps/data, ordinary profiles and previous failure evidence.
   No store publication, OTA update or provider inference is part of this fix.


## Exploration
# Exploration

- `apps/mobile/index.ts` evaluates Expo initialization before importing the app.
  Insert the polyfill bootstrap immediately after the Expo import.
- `apps/mobile/src/polyfills.ts` is a small testable mobile-only initialization
  boundary; its sole current responsibility is Intl.Segmenter compatibility.
- `apps/mobile/src/polyfills.test.ts` removes the native constructor before
  importing the bootstrap and contracts, then exercises real schema decoding.
- `apps/mobile/package.json` and `pnpm-lock.yaml` own the pinned dependency.
- `apps/mobile/README.md` documents why bootstrap order matters.

Base: bc9eeb9a6f5e3fe2e6d58d9c1b14d5ed93d6c2be. Generated Xcode/Gradle products,
signing identities, provisioning profiles and device identifiers stay outside
the tracked patch.

