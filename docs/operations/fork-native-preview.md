# Personal fork native previews

These are unsigned personal previews of stable `v0.1.4`, not releases.
Each artifact's generated `manifest.json` records the full upstream product-base
commit, actual build commit, source-overlay paths, version-only release transform,
and artifact hashes. Historical v0.0.42 evidence does not qualify this port.

## Isolation and limits

Build desktop artifacts with `--fork-preview` and a preview version such as
`0.1.4-preview.20261029.1`. The installer identity is
`com.tesseracode.t3code.preview`, named **T3 Code Fork Preview**.

The packaged bootstrap selects `~/.t3-fork-preview`, with Electron state below
its `electron` directory. It ignores an ambient ordinary T3 home and refuses
known live-profile paths. For an owned test directory, set
`T3CODE_FORK_PREVIEW_HOME` before launching. Do not set it to an existing install.
The preview keeps a separate single-instance lock, disables automatic updates
and does not register the stock T3 URL schemes.
Its runtime application name remains fork-specific after startup branding,
not just in the installer.
Preview startup does not import V1 local storage from stock profiles. Existing
storage in the same preview profile is retained; updating a build does not clear
previously imported data. Use a fresh owned preview home when qualifying isolation.

Desktop cloud OAuth and native passkeys are intentionally unavailable in this
isolated unsigned profile. Use local/direct connections. Do not use managed
remote installation/update flows against an existing production environment.
Provider sessions use their configured provider homes; choose separate homes
for isolation. Automated checks must disable providers or use owned provider
homes and must not run provider turns.

WSL uses its Linux user's `~/.t3-fork-preview` for both data and runtime cache.
The Windows path is never forwarded as the Linux data directory. Runtime
installation, pruning and invalidation stay outside the stock WSL cache.
Account-home probes send their shell script on stdin, avoiding Windows/WSL
argument re-quoting. They read the Linux account database, not an inherited
`HOME`. A failed probe stops isolated startup rather than using the ordinary
profile; its transport/exit details are logged.

## Build

Use the repository's Node **26.12.1** and pnpm **12.14.0**, with the existing
native prerequisites in the development runbook. In a
dedicated build checkout, install locked dependencies, then use
`scripts/update-release-package-versions.ts` to align the four release manifests.
Do not commit that build-time version transform.

```sh
node scripts/build-desktop-artifact.ts \
  --platform mac --arch arm64 --target dmg \
  --build-version 0.1.4-preview.20261029.1 --fork-preview --keep-stage
node scripts/fork-preview-manifest.mjs \
  --directory release --target mac-arm64 --version 0.1.4-preview.20261029.1 \
  --product-base v0.1.4
```

Windows uses the same builder with `--platform win --arch x64 --target nsis`
and `--wsl-runtime <matching-linux-x64-archive>`. Build the Linux single-executable
and archive on Linux using the existing CLI builders, then smoke it before
embedding it. The build verifies the reviewed native dependency closure,
Windows payload budget, and embedded archive digest; those gates are not optional.

`.github/workflows/fork-native-preview.yml` is manual-dispatch-only and build-only.
There are no push, tag, pull-request, scheduled or reusable-workflow triggers.
It uploads Linux and
Windows artifacts without release tags, npm publication, signing or deployment.
The approved preview batch permits at most **four build-only CI attempts per target**
(Linux x64 and Windows x64), including reruns and new dispatches. Record each
attempt's run URL, exact source commit, target, result and remaining budget before
retrying; never retry automatically. The parent/integration operator owns dispatch.
Changing the upstream port does not reset that allowance.
The upstream release and signed macOS PR-preview workflows are not appropriate:
they can publish or sign.

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

## Required qualification report

Attach actual manifests, hashes and command transcripts, not reconstructed
snapshots. Report separately:

- Native macOS arm64 candidate build and explicitly authorized UI verification.
- Linux x64 build and archive smoke on native Linux.
- Windows x64 installer execution, complete unpacked-application file count
  (maximum **80**), native dependency load and separate preview instance/profile.
- Receiving-host WSL/Ubuntu cold installation, executable `copilot`/`rg`/`tgrep`
  modes, warm-cache reuse and repair, account-home probing, and isolated state.
- Native Copilot session continuity on each receiving host, using authorized,
  isolated provider homes; automated packaging must not run provider turns.

An unavailable Windows/WSL/Ubuntu receiving host is **pending**, not passed.
POSIX readiness fixtures on macOS and archive smoke do not qualify installed WSL.
Self-containment probes must run where no ancestor `node_modules` is visible;
the builder deliberately refuses otherwise. If filesystem policy permits only
an in-worktree directory, report that gate as blocked instead of weakening it.
