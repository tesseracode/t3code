# Feature Request: Show Copilot activity descriptions beside the chat brain indicator

**Slug**: `copilot-chat-activity-intent`
**Created**: 2026-10-04T17:32:43Z

## Description

Show Copilot's own short description of its current work beside the in-chat
brain indicator on web, desktop, and native mobile. Keep sidebar statuses
simple and short. Fall back to the existing generic chat label when a current
description is unavailable.

## Status and baseline

Requested only; implementation is not approved. Research and registration do
not advance the tpatch lifecycle. Tracking issue: #24. Canonical backlog: #1.

Branch `request/copilot-chat-activity-intent` starts from published fork source
`bc9eeb9a6f5e3fe2e6d58d9c1b14d5ed93d6c2be`
(`0.0.42-preview.20261003.2`). The investigation also checked the native mobile
checkout at `aeb0b48220d2cb83698e2298a163261f75ec5681`; the adapter, ingestion,
and chat indicator files cited below are unchanged from the published base.

## Investigation: SDK support already exists

The installed `@github/copilot-sdk` 1.0.8 exposes `assistant.intent`:

- `data.intent` is a human-readable description of the current activity or plan.
- `ephemeral: true` means it is a live hint, not a persisted native session event
  that can be reconstructed from session history after resume.
- Optional `agentId` distinguishes a subagent from the root agent.
- This is a dedicated activity description, separate from reasoning content.
  No additional model call, terminal scraping, or polling is needed to consume it.

Authoritative pinned SDK source:

- [Streaming event reference](https://github.com/github/copilot-sdk/blob/a54b0b5885534ba5ad073cfe99c7f0085b1be11c/docs/features/streaming-events.md#assistantintent).
- [Event and payload types](https://github.com/github/copilot-sdk/blob/a54b0b5885534ba5ad073cfe99c7f0085b1be11c/nodejs/src/generated/session-events.ts#L3241-L3277).

The SDK tag `v1.0.8` resolves to the full commit above. No SDK upgrade is
indicated by this investigation. Event availability and cadence across models,
long-running tools, resumed sessions, and background work have not been measured
in a new live provider run.

## Investigation: where the fork currently loses the description

All source references below are relative to the published baseline:

1. `apps/server/src/provider/Layers/CopilotAdapter.ts:1317-1337` already reads
   `assistant.intent`. Root-agent intent becomes `tool.progress.summary`;
   known child-agent intent becomes `task.progress.description`.
2. `apps/server/src/orchestration/Layers/ProviderRuntimeIngestion.ts:744-780`
   discards `tool.progress` without a `taskId`. The root intent therefore does
   not become a chat activity through this projection.
3. `packages/contracts/src/providerRuntime.ts:761-770` already types the
   optional summary on the runtime progress payload. This is not, by itself,
   a client-visible current-intent contract.
4. `apps/web/src/session-logic.ts:484` and
   `apps/mobile/src/lib/threadActivity.ts:423` skip `tool.progress` in the
   ordinary work-log mapping.
5. `apps/web/src/components/chat/MessagesTimeline.tsx:2375-2382` and
   `apps/mobile/src/features/threads/thread-work-log.tsx:1131-1147` render
   the brain row with the fixed label `Thinking`.

This is a modest end-to-end enhancement, not merely a JSX label replacement.
The existing exclusions intentionally prevent progress heartbeats from filling
the durable work log; do not remove them indiscriminately.

## Requested outcome to assess during analysis

- Render the latest relevant root-agent description in the chat brain/status
  row. Do not expand sidebar, thread-list, badge, notification, or Live Activity
  status labels. Preserve the elapsed-time display.
- Treat the description as advisory text, never as authoritative execution,
  completion, attention, or connection state. Approval/input, failure,
  disconnection, setup, and compaction states retain their existing precedence.
- Scope current intent by environment, thread, and active turn. Subagent
  descriptions must not overwrite the root-agent label.
- Clear or invalidate stale text at turn and session boundaries, abort/error,
  and reconnect. A resumed client must not present a historical description as
  current work. Assess a bounded current-state snapshot versus waiting for the
  next live event before choosing the smallest correct transport.
- Preserve the Copilot completion fix: model iteration boundaries and
  `assistant.idle` do not independently complete a T3 user turn; successful
  completion remains tied to root `session.idle`.
- Keep only the latest bounded plain-text hint for rendering. Deduplicate
  unchanged text; do not append one permanent chat row per progress update,
  introduce a per-row timer, or add continuous animation.
- Support narrow mobile screens, large text, accessibility labels, and stable
  virtualized layout without a scrolling marquee or disruptive reflow.
- Web and desktop share presentation; iOS and Android require the native
  presentation path. Local, direct remote, NetBird, SSH/relay, multiple
  environments, and multiple clients must preserve the same scoping rules.
- Keep generic labels for providers without a supported activity-description
  signal. Do not generate synthetic descriptions from reasoning or tool output.

## Evidence and ownership before implementation

Verify real SDK event availability in an explicitly approved isolated session.
Cover absent/repeated hints, subagents, late events, lifecycle clearing,
reconnect, and cross-environment isolation in focused behavior tests. An approved
integrated client pass should verify the actual brain row rather than only
asserting prop wiring.

Assess maintained-root ownership before implementation: reuse or extend
`copilot-cli-provider` for adapter behavior rather than create an overlapping
backend root. Do not change canonical attention, notification delivery, or
provider lifecycle semantics as part of this request.

No runtime implementation, analyze/define/apply phase advancement, provider
turn, device interaction, build, deployment, PR, or release is authorized by
this registration.
