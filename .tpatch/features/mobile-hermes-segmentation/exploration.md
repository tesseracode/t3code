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
