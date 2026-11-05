# Scope

`adapter.ts` constructs one `SessionConfig` for `createSession` and
`resumeSession`; the latter also supplies `continuePendingWork: false`.
Add `requestExtensions: false` there. Existing permissions, skills and MCP config
remain untouched.

Extend the fake SDK to model the independently reproduced missing-host failure,
then exercise creation and cold resume through the existing adapter harness.
Native controls use only new disposable profiles.
