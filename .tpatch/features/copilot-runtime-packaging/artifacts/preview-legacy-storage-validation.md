# Preview legacy storage isolation follow-up

Investigated source: `f69617f5964758e48b8dbdb65ab96c36a1533aa0`.
Branch: `tpatch/preview-legacy-storage-isolation`.
Final full-root capture baseline: `75b2ad95056ea428008d551e2980f1ac389defaf`.

## Confirmed cause and narrow boundary

`DesktopApp.bootstrap` unconditionally calls `DesktopLegacyLocalStorage.load`
with the resolved Electron userData path, before creating a window.
The loader previously skipped only development builds. A fresh preview had no
import marker, so it independently searched the normal appData directory's
`T3 Code (Alpha)` and `t3code` profiles and read the newest V1 Local Storage
LevelDB. Selecting an isolated T3/Electron home did not constrain that search.
The preload subsequently offers the imported items to the normal merge logic.
This confirms the reported stock-profile read despite a fresh preview home.

The LevelDB reader itself uses filesystem reads, not Keychain decryption. This
investigation does not establish that the migration caused every observed
SecItemCopyMatching/CDP stall; there was no native runtime rerun. No crypto
fallback, safeStorage implementation or OS security setting is changed.

The single product-code guard now also skips this loader for isolated previews,
before marker probes, stock profile discovery, reads or import completion.
Existing local storage inside the same preview profile is neither read by this
importer nor cleared. Normal non-preview V1 migration, completion marking and
merge behavior are unchanged. Previously imported preview data is not deleted;
fresh owned homes remain appropriate for isolation qualification.

## Focused regression proof

All commands used Node 26.12.1 and the root node_modules/.bin on PATH.
Filesystem fixtures used the owned worktree's `.t3/packaging-check` as TMPDIR.
`ELECTRON_OVERRIDE_DIST_PATH` pointed to an owned, nonexistent test-only path to
prevent Electron's module loader from downloading a binary. No Electron app,
server, browser, provider turn, Keychain read, OS permission or CI dispatch ran.

The new test mocks only the LevelDB decoder and creates owned filesystem
fixtures. Preview filesystem operations fail immediately, proving the guard
precedes even the marker probe; the decoder is not invoked, no marker is written
and same-preview storage bytes remain intact. A normal-mode test verifies that
the V1 fixture is imported once and the completion marker suppresses reimport.

Before the source fix:

```sh
cd apps/desktop
vp test run src/app/DesktopLegacyLocalStorage.test.ts
```

Result: **one expected preview-isolation regression failed, one normal-mode test
passed**. Log: `.t3/packaging-check/legacy-storage-before.log`.

After the source fix:

```sh
cd apps/desktop
vp test run src/app/DesktopLegacyLocalStorage.test.ts \
  src/app/DesktopUserData.test.ts src/legacyLocalStorageMerge.test.ts
```

Result: **12 tests passed**, no skips.
Log: `.t3/packaging-check/legacy-storage-after.log`.

From the root:

```sh
vp run --filter @t3tools/desktop typecheck
vp lint apps/desktop/src/app/DesktopLegacyLocalStorage.ts \
  apps/desktop/src/app/DesktopLegacyLocalStorage.test.ts
```

Both passed. Logs: `.t3/packaging-check/legacy-storage-types.log` and
`.t3/packaging-check/legacy-storage-lint.log`. Targeted formatting and
product-source whitespace checks also passed. No dependencies were installed.

## Complete root preservation

Retain all 29 paths of the integrated packaging root, including the parent-owned
`scripts/lib/cli-external-packages.ts` and its test, full reviewed native closure,
and CI `TEMP`/`TMP` values `C:\t3\tmp`. Add only the legacy storage service/test
paths, giving **31 product paths**. Existing preview runbook changes stay inside
its already owned path. Final canonical patch and recipe must be recaptured from
the real baseline above, not left as the narrow follow-up delta.

The primary's earlier packaging test and CI outcomes are not rerun or relabelled
here. This source fix requires a fresh native preview build and explicitly
authorized runtime qualification; no claim is made that the Keychain stall has
been eliminated.

## Capture provenance

The narrow fix was recorded before source commit
`fbb4c4db0d6d87cf88cd28b89e1131134fabc855`. The final canonical root was then
recaptured with all 31 paths using `--from
75b2ad95056ea428008d551e2980f1ac389defaf --to
fbb4c4db0d6d87cf88cd28b89e1131134fabc855 --regenerate-recipe`.
The installed serializer still omits preimage fields; all 31 were annotated from
real baseline Git blobs and checked against current filesystem contents, then
preserved through a scoped committed-range record without recipe regeneration.
Round-trip patch validation passed. The previous 29 paths are retained exactly
except the directly related preview runbook addition; native runtime, external
boundary and workflow bytes are unchanged from the investigated source.

Pre-landing verification correctly refused stale evidence from the prior
`15a7a8bcf3d29af876eeccf387b4f0da95a5b45f` packaging landing after the patch and
recipe changed. The actual hard-parent landing gate is satisfied; a new ordinary
tpatch landing is needed to bind this full-root generation. Historical blocked
reconcile evidence remains untouched.

The full root was genuinely landed with `tpatch land --no-record` at
`1cc830d637b6729c38e7acedee476db06e0c8015`. It has matching patch/recipe/base
trailers and a satisfied hard-parent state gate. Post-landing `tpatch verify`
still exited **2**: it recognizes this exact landing, but refuses parent replay
because the canonical native-Copilot patch attested at
`92e65ded1dd53ac16c888b7ff344edc64a61a6c6` is not present at the historical
verification baseline. Parent metadata was not changed or bypassed; the failed
verification record remains truthful. Log:
`.t3/packaging-check/legacy-root-verify-after-land.log`.

Separately, direct Git validation using an owned isolated index loaded from the
real `75b2ad95056ea428008d551e2980f1ac389defaf` tree accepted the complete
31-path canonical patch with `git apply --cached --check`; reverse-checking it
against the current tree also passed. All 31 recipe preimages/current contents
were checked, and all 28 unaffected existing product paths are byte-identical to
the investigated source. This proves root coverage and forward applicability,
not successful tpatch parent replay or native runtime qualification.
