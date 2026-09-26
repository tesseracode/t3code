# Stable v0.0.42 Windows/WSL result

Verdict: VALIDATION_INCOMPLETE

- Product SHA: `02abd6f050e22cb872dafa64806cba698beab7c5`
- Handoff SHA:
- Windows / PowerShell / Node / Rust versions:
- WSL distro, version, CPU architecture:
- Explicit OpenAI model used:
- Run ID:
- Any handoff-only changes:

## Automated gates

| Gate | PASS / FAIL / NOT RUN | Sanitized evidence |
|---|---|---|
| Frozen source and isolated state | NOT RUN | |
| Nine focused test files | NOT RUN | |
| Complete Linux x64 SEA archive built and smoked | NOT RUN | |
| Windows NSIS artifact built | NOT RUN | |
| Whole Windows payload <=80 files | NOT RUN | |
| Embedded WSL archive bytes match independent Linux archive | NOT RUN | |
| Exact SDK/CLI/platform/Koffi/transitive closure | NOT RUN | |
| Windows SEA archive, empty-PATH startup and HTTP | NOT RUN | |
| Packaged native backend HTTP | NOT RUN | |
| Explicit OpenAI model available and used | NOT RUN | |
| Packaged SDK permission request and approved output | NOT RUN | |
| SDK -> native CLI -> fresh SDK original session/history | NOT RUN | |
| Synthetic probe session deleted; clients stopped | NOT RUN | |
| Production WSL installer hash and executable modes | NOT RUN | |
| Packaged WSL SEA backend HTTP without host Node | NOT RUN | |
| Concurrent Windows/WSL and distinct environment identity | NOT RUN | |
| Windows write produces Linux inotify event | NOT RUN | |
| Native and WSL restart identity preservation | NOT RUN | |
| Upstream 1-52 plus separate fork 44/45 ledgers and schema | NOT RUN | |
| Raw missing-distro isolation | NOT RUN | |

## Integrated gates

| Gate | PASS / FAIL / NOT RUN | Sanitized evidence |
|---|---|---|
| Isolated packaged desktop starts | NOT RUN | |
| Bundled Copilot 1.0.75 and explicit OpenAI defaults | NOT RUN | |
| Native Windows project/environment ownership | NOT RUN | |
| Native WSL project/environment ownership | NOT RUN | |
| Real T3 Windows supervised approval and marker | NOT RUN | |
| Real T3 WSL supervised approval and marker | NOT RUN | |
| Loaded-thread search, next/previous and button-focused Escape | NOT RUN | |
| Command-palette search entry | NOT RUN | |
| Native Windows terminal command and cwd | NOT RUN | |
| Native WSL terminal command and cwd | NOT RUN | |
| Desktop restart preserves projects, messages and identity | NOT RUN | |
| Post-restart turns reuse both original native sessions | NOT RUN | |
| Actual T3 invalid-distro recovery; native remains usable | NOT RUN | |
| Settings restored; both environments reconnect | NOT RUN | |

## Cleanup gates

| Gate | PASS / FAIL / NOT RUN | Sanitized evidence |
|---|---|---|
| Exact native backend handles stopped | NOT RUN | |
| Exact foreground WSL backend stopped | NOT RUN | |
| Integrated desktop and owned children stopped | NOT RUN | |
| Only validation-owned WSL state removed | NOT RUN | |
| Normal user T3/Copilot state untouched | NOT RUN | |
| Local evidence retained and returned output sanitized | NOT RUN | |

## Artifact hashes

| Artifact | SHA-256 | Size |
|---|---|---|
| Windows NSIS | | |
| Windows SEA ZIP | | |
| Independent Linux x64 archive | | |
| Embedded WSL archive | | |
| Production-generated WSL install script | | |

## Failures and limits

For each failure give its classification, first failing gate, concise redacted
error, reproduction and any handoff-only fix. Do not include secrets or raw
logs. Signed/notarized releases and other architectures are not implied.
