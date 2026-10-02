# Feature Request: Copilot working and completion fidelity

**Slug**: `copilot-work-lifecycle-indicators`
**Created**: 2026-10-02T05:50:57Z

## Status and baseline

Requested only, on the explicitly approved provider research branch
`feature/copilot-observability`, based on
`982929e9323f00ded5c7ca943f22a0bcef669a6f`. No runtime fix or lifecycle
advancement is authorized in this slice. Hard parent: `copilot-cli-provider`.
Issue #20 owns investigation evidence and implementation decisions.

## Problem and verified premise

Keep a Copilot user turn visibly working until its actual completion, including
ordinary tool/model iterations and any outstanding native work. Thinking is a
phase, not the lifetime of the user's request.

An isolated web reproduction with SDK 1.0.8 and actual CLI 1.0.75 reproduced
premature completion with both `gpt-6-astra` and `gpt-5.6-sol`. The same
read-only synthetic workload inspected two fixture files, ran a bounded
12-second shell probe, and then answered. At the first `assistant.turn_end`,
the adapter emitted `turn.completed` and cleared `activeTurnId`, while later
native `assistant.turn_start`, tool execution and final response events still
followed. Native `session.idle` arrived 17.544 seconds later for Astra and
16.233 seconds later for Sol.

The web client initially showed Thinking, Working and Stop generation. It then
showed a completed "Worked for" duration and Send while work continued. A
separate Monitoring indicator appeared during the shell task; it did not make
the prematurely completed foreground turn correct. Completion is therefore
not wholly absent, but its timing and duration are wrong.

This reproduces without subagents and is not specific to GPT-6 asynchronous
tools. A separate approved SDK probe confirmed `metadata.activity()` reported
`hasActiveWork: true` after intermediate assistant turn-end events and false
after `session.idle`.

## Requested outcome

- Preserve the distinction between native model/tool iterations, the T3 user
  turn, and genuinely independent background work. Do not invent an activity
  heuristic from reasoning text, tool silence or elapsed time.
- Keep thinking, tool progress, working, waiting for input/approval, failure,
  interruption and terminal completion consistent with authoritative signals.
- Preserve one correct completion and turn attribution, final output, usage,
  checkpoints, queue behavior and attention transitions.
- Reuse current canonical state, web/desktop indicators and mobile shared
  state. Do not add an always-animating spinner or another polling coordinator.
- Cover normal tool loops, errors, aborts, reconnect/resume, queued messages,
  and attached/background work before selecting the completion boundary.

## Prior art and boundaries

At HerdR `d6b40d4edd550ccea081f089605a64314f8c8b27`, the Copilot manifest
prioritizes permission/selection blockers, explicit waiting-for-background-agent
text and cancel/interrupt hints. The generic detector can consume OSC title
and progress strings; this Copilot manifest uses screen rules. Its Copilot v3
integration keeps SessionStart for session identity, not lifecycle authority.
Use this as a UX comparison, not a reason to install hooks or copy terminal
regexes into T3's typed SDK adapter.

SDK 1.0.8 describes `session.idle` as no background agents or attached shell
commands in flight and exposes `metadata.activity().hasActiveWork`. These
signals need explicit foreground/background semantics; merely replacing one
event handler without those cases is not the requested implementation.

Record the actual executable version: the 1.0.75 package can select a newer
cached CLI. The reproduction disabled auto-update/cache selection and checked
the runtime version. No dependency update, other-model inference, notification
delivery, cross-machine coordinator, live-state write or platform qualification
is part of this request.

Upon approval, decide whether to extend the complete maintained provider root
or explicitly consolidate/supersede it; do not silently layer an overlapping
backend patch. Native capability inventory: #16. Canonical backlog: #1.
