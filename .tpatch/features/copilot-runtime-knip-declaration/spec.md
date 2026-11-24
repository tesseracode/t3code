# Acceptance

- The same server dependency audit passes without deleting the SDK dependency.
- Scope the exception only to `@github/copilot-sdk` in `apps/server`.
- Preserve source-server resolution, external closure, and native payload tests.
- Run changed-file checks; no dependency installation or packaged deployment.
