# Personal fork native previews

PKG-01 builds unsigned personal previews, not a release. Product base:
`982929e9323f00ded5c7ca943f22a0bcef669a6f`. The build commit also contains the
explicit preview-isolation overlay and build-only workflow. Each artifact's
`manifest.json` records both commits and the source-overlay paths.

## Isolation and limits

Build desktop artifacts with `--fork-preview` and a preview version such as
`0.0.42-preview.20261001.1`. The installer identity is
`com.tesseracode.t3code.preview`, named **T3 Code Fork Preview**.

The packaged bootstrap selects `~/.t3-fork-preview`, with Electron state below
its `electron` directory. It ignores an ambient ordinary T3 home and refuses
known live-profile paths. For an owned test directory, set
`T3CODE_FORK_PREVIEW_HOME` before launching. Do not set it to an existing install.
The preview keeps a separate single-instance lock, disables automatic updates
and does not register the stock T3 URL schemes.

Desktop cloud OAuth and native passkeys are intentionally unavailable in this
isolated unsigned profile. Use local/direct connections. Do not use managed
remote installation/update flows against an existing production environment.
Provider sessions use their configured provider homes; choose separate homes
for isolation. Automated checks must disable providers or use owned provider
homes and must not run provider turns.

WSL uses its Linux user's `~/.t3-fork-preview` for both data and runtime cache.
The Windows path is never forwarded as the Linux data directory. Runtime
installation, pruning and invalidation stay outside the stock WSL cache.

## Build

Install the existing native prerequisites in the development runbook. In a
dedicated build checkout, install locked dependencies, then use
`scripts/update-release-package-versions.ts` to align the four release manifests.
Do not commit that build-time version transform.

```sh
node scripts/build-desktop-artifact.ts \
  --platform mac --arch arm64 --target dmg \
  --build-version 0.0.42-preview.20261001.1 --fork-preview --keep-stage
```

Windows uses the same builder with `--platform win --arch x64 --target nsis`
and `--wsl-runtime <matching-linux-x64-archive>`. Build the Linux single-executable
and archive on Linux using the existing CLI builders, then smoke it before
embedding it. The build verifies the reviewed native dependency closure,
Windows payload budget, and embedded archive digest; those gates are not optional.

`.github/workflows/fork-native-preview.yml` is build-only. It uploads Linux and
Windows artifacts without release tags, npm publication, signing or deployment.
The approved unattended budget is two CI attempts per target. The full upstream
release workflow is not appropriate for this task.

## Install, inspect and roll back

Verify `SHA256SUMS` before using a download. Mac previews can be copied from the
DMG to a separately named application location. Windows installs under the fork
preview identity, not the ordinary app identity. Unsigned downloads may show OS
warnings; never disable Gatekeeper or SmartScreen globally.

First launch should show **T3 Code Fork Preview**, a fresh profile and TWS disabled.
Check the native environment before adding a separate test project. On Windows,
exercise WSL explicitly in Connections and confirm it is a distinct environment.
The independently smoked Linux archive alone does not qualify WSL integration.

Quit only the preview, then uninstall/remove that preview application to roll
back. Preserve `~/.t3-fork-preview` unless deliberately discarding preview work;
do not copy it over the normal profile. Do not mix backend versions against the
same database.

Build success, CLI smoke, native UI checks and receiving-host Windows/WSL
qualification are separate gates. Keep unrun gates marked pending. No artifacts
from this workflow are a signed/notarized release or an automatic update.
