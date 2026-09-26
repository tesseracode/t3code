# Windows/WSL qualification agent

Validate the reconciled T3 Code fork end to end on real Windows 11 x64 with
x64 Ubuntu 24.04 under WSL2.

- Clone `https://github.com/tesseracode/t3code.git`.
- Checkout `validation/v0.0.42-platform-qualification`.
- Confirm `02abd6f050e22cb872dafa64806cba698beab7c5` is an ancestor of HEAD.
- Read `AGENTS.md` and this directory's `README.md` completely.
- The immutable product source is exactly
  `02abd6f050e22cb872dafa64806cba698beab7c5`; the runner checks it out separately.
- The release version is 0.0.42. The runner's four version-manifest changes
  are the standard release transform, not permission for other source edits.

This is the fresh no-skip rerun after the previous Windows run stopped on two
source fixture portability failures. Those fixtures and the Rustup PATH
handoff mismatch are repaired. Read the README's rerun notes; do not downgrade
Koffi, bypass TLS/lockfile checks or treat the old failed run as a package pass.

Use **OpenAI/MAI models only**, including subagents and reviewers. Confirm model
selection explicitly; never assume inheritance. The native continuity probe
uses `gpt-5-mini`, verifies availability, and must not fall back to Auto/Claude.
Before integrated T3 turns, select an explicit OpenAI model for both new threads
and text generation, and disable unrelated providers in the disposable instance.

You may inspect the host, install missing ordinary prerequisites from the
runbook, and launch/interact with the isolated Electron app and browser UI.
Ask before reboots, enabling Windows features, creating/importing a distro,
or unrelated machine-wide changes.

Never use existing T3 state or the user's normal Copilot home. Do not copy or
return credentials, device codes, pairing URLs, auth files or unrelated history.
If authentication is needed, ask the human to complete it locally. Prefer
authenticated GitHub CLI so disposable Copilot homes need no credential copy.

Do not kill by name/path or stop unowned PIDs. Do not commit, push, create a PR,
dispatch workflows, or edit frozen product source. Handoff-only fixes may be
made locally after diagnosing a real harness defect; return their exact diff.

Run:

```powershell
pwsh -NoLogo -NoProfile -File .\validation\v0.0.42-platform-qualification\run.ps1 `
  -WslDistro Ubuntu
```

Then execute **every integrated and cleanup gate** in the README using the
guarded desktop launcher. The Linux SEA archive must be built independently
and embedded verbatim; do not restore `--wsl-prebuild` or a loose Node tree.
Do not relax the 80-file whole-app limit, exact package versions, SHA checks,
model selection, isolation, or PID ownership.

Classify failures accurately: host prerequisite, authentication, harness,
packaging, native runtime, WSL runtime, or product integration. A missing
prerequisite or a model failing a strict synthetic prompt is not automatically
a product defect.

Return sanitized `RESULTS.md` and `run-summary.json`, artifact hashes, exact
source/handoff SHAs and any handoff-only diff. Keep raw local paths/secrets out
of the returned report. Finish with one verdict:

- `WINDOWS_AND_WSL_PASS`
- `PRODUCT_DEFECT_FOUND`
- `HOST_PREREQUISITE_BLOCKED`
- `VALIDATION_INCOMPLETE`

Do not claim PASS while any automated, integrated or cleanup gate is FAIL or
NOT RUN. Mac/Linux evidence in another session does not certify this Windows run.
