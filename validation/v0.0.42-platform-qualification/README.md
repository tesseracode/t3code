# Stable v0.0.42 packaged-platform qualification

This validation-only branch is a handoff, not a product change or a branch to
merge into the maintained fork.

## Frozen product

- Repository: `https://github.com/tesseracode/t3code.git`
- Handoff branch: `validation/v0.0.42-platform-qualification`
- Product source: `06fb8876807cd02fce21e49295515ad2f0aebfd7`
- Upstream base: v0.0.42, `719a76ca1dbf5490f1aa33ffb9966301e02be9a9`
- Release version: `0.0.42`
- Windows target: x64 Windows 11 and x64 Ubuntu 24.04 under WSL2

The runner creates a separate detached source checkout. It applies the normal
release version-alignment script to four package manifests, just as release CI
does. No validation scripts enter the packaged app. Other product edits are
not permitted.

The source includes the packaged-search Escape fix. Packaging is maintained
by `copilot-runtime-packaging`; do not replay superseded historical roots.
The former Windows-created Linux node_modules archive no longer exists:
Windows embeds an independently built, complete Linux SEA CLI archive unchanged.

## Safety and model policy

- Use OpenAI/MAI models only, including delegated agents and reviewers. Never
  assume model inheritance. The continuity probe explicitly selects and checks
  `gpt-5-mini`; unavailable models fail rather than falling back.
- Use only disposable T3 and Copilot homes. The direct probe no longer uses the
  user's normal `.copilot` directory. Authenticate GitHub CLI beforehand so the
  SDK/native CLI can use existing subscription credentials without copying files.
  The integrated Windows launcher obtains the existing GitHub CLI token only
  in memory before isolating `APPDATA`; it is passed to the owned child process,
  never written to the launch record or forwarded through `WSLENV`.
- Do not print, copy, commit or return tokens, auth files, pairing URLs, device
  codes or unrelated conversations. Complete interactive authentication locally.
- Never start against existing T3 state, set dev `VITE_HTTP_URL`/`VITE_WS_URL`,
  or kill processes by name/path. Cleanup uses captured PIDs and identity checks.
- Windows and WSL authenticate independently. If Linux Copilot needs login,
  have the human authenticate it in the validation-owned Linux home; do not
  copy the Windows credential store or assume Windows GitHub CLI login transfers.
- Cancel prompts to reset/create a default OS keychain or change unrelated
  system credential configuration. Record that host boundary rather than
  weakening isolation or presenting it as a product pass.
- The automated WSL backend stays attached to a tracked `wsl.exe` process;
  there is no `nohup`, detached service or pattern-based process termination.
- The integrated WSL launcher refuses an account with pre-existing `.t3` or
  `.copilot` unless its own recorded prior launch owns both. Use a human-approved
  disposable distro/account otherwise. Never remove unfamiliar state.
- Keep raw evidence local under ignored `output/`. Sanitize paths and runtime
  identifiers before returning a report; never overwrite the local cleanup record
  with a redacted copy.

## Prerequisites

Inspect first; install only missing ordinary build prerequisites.

Windows: PowerShell 7.3+, Git, authenticated GitHub CLI with Copilot access,
Node 24.13.1+ below 25 with Corepack, Rustup/stable x64 MSVC target, and Visual
Studio C++ Build Tools with x64 Spectre libraries
(`Microsoft.VisualStudio.Component.VC.Runtimes.x86.x64.Spectre`).

WSL: an x64 WSL2 Ubuntu 24.04 distro, `bash`, `cargo`, `rustc`, `curl`, `file`,
`git`, `g++`, `make`, `python3`, `tar`, `sha256sum`, `flock` and `inotifywait`.
Rust must be recent enough for the committed Cargo lockfiles.

Typical Ubuntu system packages:

```sh
sudo apt-get update
sudo apt-get install -y ca-certificates curl file git build-essential \
  python3 inotify-tools util-linux
```

The WSL helper installs checksum-verified Node 24.19.0 and SEA Node 26.8.2 in
its run-specific build directory, not into the system. The Windows SEA build
uses pinned Node 26.8.2 through pnpm. The packaged WSL backend itself does not
require a host Node installation.

Ask before reboots, enabling Windows features, creating/importing a WSL
distro, or unrelated machine-wide changes. Do not upgrade unrelated providers.

## Automated run

```powershell
pwsh -NoLogo -NoProfile -File .\validation\v0.0.42-platform-qualification\run.ps1 `
  -WslDistro Ubuntu
```

Use `-NativePort` / `-WslPort` if the defaults are occupied. The runner refuses
to displace another listener. A fresh run uses a unique source checkout and
state directory. Skip flags produce a partial result, never a full pass.

The runner:

1. Checks prerequisites, authentication, WSL2 architecture, ports and frozen
   source ancestry. Installs filtered dependencies and runs nine focused files.
2. Builds and smoke-tests the complete Linux x64 CLI archive inside WSL.
3. Builds the Windows x64 NSIS package with that archive passed as
   `--wsl-runtime`; verifies its embedded bytes are identical.
4. Builds and smoke-tests the Windows SEA CLI archive with no Node on its
   runtime PATH.
5. Validates `server.asar`, unpacked native payloads, exact Copilot dependency
   versions and the unchanged **80-file whole-Windows-app limit**.
6. Starts the actual packaged Windows backend against disposable state.
7. Runs a real supervised SDK turn, resumes its original session through the
   packaged native CLI, then resumes with a fresh SDK client. It checks
   persisted history, the selected OpenAI model, exact markers and cleanup.
8. Generates the production WSL installer from the frozen source, validates its
   hash and the archive hash, then runs the self-contained Linux `t3`.
9. Proves concurrent Windows/WSL operation, distinct environment identities,
   Windows-to-Linux `inotify`, and identity persistence across backend restarts.
10. Reads SQLite **read-only** to verify upstream migrations through 52, the
    genuine upstream 44/45 names, the separate fork 44/45 ledger, required
    tables and foreign-key integrity.
11. Checks missing-distro rejection while the native backend stays responsive.
    This raw command check does not replace the integrated fallback gate.

The source stage is confined to the run's own temporary directory. Native
process output is captured, pairing URLs are redacted, and cleanup failures
fail the run. The same portable continuity probe is used on Mac/Linux; its
recorded platform/architecture, not its legacy synthetic marker prefixes,
identify which host was exercised.

## Required integrated desktop pass

After the automated run passes:

```powershell
pwsh -NoLogo -NoProfile -File .\validation\v0.0.42-platform-qualification\launch-desktop.ps1 `
  -RunDirectory "<exact run directory>" -WslDistro Ubuntu
```

Use semantic UI/browser automation where available. Do not edit databases to
simulate successful product behavior.

1. Confirm the isolated packaged client loads and its native backend is healthy.
2. In the disposable settings, disable unrelated providers; enable GitHub
   Copilot and require its bundled runtime to report 1.0.75 and authenticated.
3. Explicitly choose an available OpenAI model for new threads and text
   generation. Do not use Auto or an inherited Claude model. Select **Supervised**
   permissions for the approval checks.
4. Add one disposable native Windows Git project and one native-Linux WSL Git
   project. Verify the correct environment owns each project/thread.
5. Send a harmless exact output command in each project. Inspect and allow it
   once through T3's actual approval UI; require the exact completion marker.
   A direct SDK probe alone does not satisfy this gate.
6. Test `Ctrl+F`, multiple occurrences, next/previous and Escape while a
   navigation button has focus. Reopening must clear the query. Exercise the
   command-palette entry once as well.
7. Open each environment's terminal and execute a harmless command; verify its
   output and working directory. This exercises the actual packaged PTY path.
8. Restart the isolated desktop normally. Confirm projects, conversations,
   selected model and environment identity persist. Send a history-dependent
   follow-up in each thread and confirm its original native session ID is reused.
9. Enable an intentionally invalid WSL distro only in the disposable settings.
   Require a recoverable error/fallback while Windows remains usable. Restore
   the exact previous settings and confirm both environments reconnect.
10. Stop the recorded desktop and verify all owned backends exit. Keep evidence,
    then remove only the recorded stage and explicitly owned test state.

```powershell
pwsh -NoLogo -NoProfile -File .\validation\v0.0.42-platform-qualification\launch-desktop.ps1 `
  -RunDirectory "<exact run directory>" -Stop -CleanupWslState
```

## Reporting

Copy `RESULTS_TEMPLATE.md` into the run directory. Mark every gate PASS, FAIL
or NOT RUN, distinguish host/harness/model-response defects from product
defects, and return sanitized `RESULTS.md`, `run-summary.json` and any exact
handoff-only diff. Keep local source changes out of the frozen product.

`WINDOWS_AND_WSL_PASS` requires automated, integrated and cleanup gates to pass.
Signed/notarized distribution, other CPU architectures, and provider feature
parity are not inferred from this unsigned x64 run.

## Other host helpers

`linux.Dockerfile` / `linux-build.sh` reproduce Ubuntu artifact builds;
`linux-runtime.sh` exercises real AppImage/CLI backends and native continuity.
`check-wsl-harness.mjs` tests the attached helper and actual release-archive
cache repairs on Linux; it does not claim Windows transport execution.
`backend-probe.mjs` and `migration-probe.cjs` preserve explicit startup,
restart, ledger and cleanup assertions.
