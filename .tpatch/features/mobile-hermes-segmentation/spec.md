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
