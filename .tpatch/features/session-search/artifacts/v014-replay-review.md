# Session-search v0.1.4 semantic replay review

## Outcome and authority

Complete feature-root replay, not an incremental fixup or a return to the V042
parallel client matcher. Baseline is `fed030d5cfba9b76789105d7f40933957d7b37cf`
(upstream v0.1.4 `783581d461dc72cdd8f78fc8abb4ad536dfc4547` plus metadata only).
Branch: `tpatch/session-search-v014`.

### Metadata-only re-attestation

The original source commit `78eec17f402cb3eaf73221672ec3e757912c6427`
has a malformed landing attestation: a blank line separates the four Tpatch
lines from the final Co-authored-by line, so Git parses only the latter as a
trailer. The original commit and its failed-evidence history remain unchanged.

The supported repair records the immutable original range from
`fed030d5cfba9b76789105d7f40933957d7b37cf` to
`78eec17f402cb3eaf73221672ec3e757912c6427`, with all 23 paths explicitly scoped.
This does not capture the coordinator's later Foundation/Attention changes on
shared paths. Record reports no canonical content change and creates no new
numbered patch or generation. Canonical patch SHA-256 remains
`e98b6ddf7a85432e3adb7ce5bb29ffc4cfae0a2d196c6239bd7d893955f20019`;
recipe SHA-256 remains
`317f5c18c9ea5ddbeaabb3a9813cbba243a365de8703c81d78fea341779f9c3f`.
The original baseline preimages and recipe provenance remain unchanged.

`tpatch land session-search --no-record` with the single-line subject
`chore(tpatch): re-attest existing session-search materialization` emits its own
contiguous five-trailer block. This is a new metadata attestation of the
already-existing full-root materialization, not a new source implementation,
source replay, history rewrite, resource capture or synthetic patch generation.
Only the scoped implementation record, this review and feature status change.
Final validation uses `git interpret-trailers --parse`, unchanged-tree/hash
checks and `tpatch verify session-search --no-write`; no tests or apps are run.
The coordinator's reported integrated checks are not rerun or relabeled as
local validation here.

The inherited canonical patch was byte-identical to the authoritative full root
at `0e032347a81b2abda824df191f10b23155bc5b9c`: SHA-256
`563e59e1794fb07b4c4f77046ead67b9e8045df0d198c5be7fd220ff30ab4d32`.
All 22 canonical paths are represented below; the upstream pending-approval
renderer requires one additional path. The historical installed V042 source
`bc9eeb9a6f5e3fe2e6d58d9c1b14d5ed93d6c2be` remains an intent reference, not a
replacement for that canonical root.

The previous reconcile exited zero but its JSON outcome was **blocked**, not
reapplied or materialized. `tpatch status` and `tpatch next` were read first.
The supported manual `apply --mode started` / `apply --mode done` lifecycle
materializes the replay; staged record captures the complete baseline-to-result
root before landing. Test execution is deliberately deferred to full integration.
Historical reconcile, resolution, revision/evidence logs and patch generations
are retained; no stash was read or modified.

The regenerated recipe contains all 23 final file contents. Its 21 existing-file
preimages are SHA-256 of exact `fed030d5` Git bytes; its two new-file preimages are
empty and those paths are absent at that baseline. The installed v0.16.0 record
generator omits preimage fields, and manual implement adoption does not publish
provenance. Both are supplied explicitly, with a hash-bound
`recipe-provenance.json` using the installed tool's documented Go struct schema.
They never hash the already-replayed working tree as a preimage.

## Actual conflicts and false positives

- The prefix-split detector cites moves under ZIP, settings and client-runtime.
  The chat target paths still exist. None of those unrelated moves calls for
  migrating the search implementation or changing a ZIP/settings source.
- A real three-way replay has two conflicted files: `ThreadFind.ts` and
  `TimelineWorkGroupRows.tsx`. The other canonical files apply in place.
- Upstream `67661cfbb` deleted unreachable in-memory search helpers. Preserve
  that deletion, rather than resurrecting an exported helper solely for tests.
  The service test now checks SQLite match identity, occurrence, active index,
  order and wrap explicitly.
- Upstream group filtering now keeps pending approvals actionable. Merge that
  predicate with the selected find member predicate, not one instead of the
  other. Keep upstream approval actions, compaction timers, icons and animation
  behavior.
- A clean textual application still needed semantic adaptation: pending
  approvals now bypass the ordinary activity label in their own renderer.
  Pass the same searchable summary and item identity into that renderer while
  finding, preserving its ordinary detail and every action outside find.
  Extend the existing concurrent-approval test with an active last-occurrence
  highlight and an actionable Decline control.
- Upstream already imports `TurnItemId` in the timeline test; discard the
  duplicate import created by contextual patch application. Keep its disposable
  render helper and fresh-element rerenders. The new keyboard test uses the same
  repository helper and explains why it opts out of routing.

## Root coverage and upstream ownership

1. **Entry points:** upstream `chat.find` owns Cmd/Ctrl+F, palette, keybinding
   settings, terminal/preview exclusions, focus and thread/environment scoping.
   Do not restore `chat.search`, `SessionSearchBar`, or `sessionSearchBus`.
2. **Documents:** restore activity source summaries for commands, reasoning,
   tool/read/search labels, changed paths, tasks, approvals, questions/answers,
   errors and notices alongside upstream message/plan rendered-text documents.
3. **Bounds:** hidden inspector/output bodies, diffs, images, embedded HTML/MCP
   resource bodies, setup-only entries and lifecycle-only cards remain excluded.
   SQL omits command output, diffs and search results before decoding. Dynamic
   input uses the ordinary bounded wire projection; resource identification does
   not turn resource content into a document.
4. **Matching:** restore shared case-insensitive NFKC, non-overlapping occurrence
   counts and original-source ranges for compatibility/combining sequences.
   Keep upstream bounded navigation windows and scan/parse cache capacities.
5. **Controls:** input Enter/Shift+Enter navigate; buttons retain native Enter;
   Escape bubbles to the find bar from every control and respects composition.
   Upstream reopening focuses/selects the existing input; close clears state.
6. **Reveal:** open the selected run/attempt/group only, map activity IDs through
   the outer detail row into the nested virtual list, pin/scroll that member and
   reveal clipped source text before highlighting. Other groups stay folded.
7. **Position ownership:** preserve upstream citation cancellation, history
   anchoring, live-follow suspension, scroll restoration and viewport ownership.
   Read the visible nested member as the query anchor; do not scroll a header.
8. **History/performance:** retain server full-thread scans with targeted bounded
   history pages, not the historical manual loaded-window search. Retain the
   v0.1.4 streaming-message replacement fast path, stable row identities,
   observer caches, outer list recycling and nested LegendList. Its generic
   input/context comparisons already invalidate for `revealedEntryId`.
9. **Compatibility:** activity opt-in and response acknowledgement isolate old
   clients/servers and are part of scan-cache identity. Web and desktop share
   this path across local/remote environments; mobile has no keyboard find UI.
   No provider adapter, SDK, transport endpoint or mobile implementation changes.
10. **Tests/docs:** retain all canonical focused cases, adapt removed memory
    coverage to the live SQLite service, extend approval coverage, update user
    keybinding help and retain the cross-boundary thread-find architecture doc.

## Per-file post-replay inspection

Each path below was read in its replayed source form and its complete delta
reviewed against v0.1.4; context inspection included the upstream fast projector,
wire projection usage, pending-approval renderer and disposable test helper.
This is the exact changed product/test/doc path set, not just conflict files.

| Path | Inspected landed behavior |
| --- | --- |
| `apps/server/src/orchestration-v2/ThreadFind.test.ts` | Activity/message/plan occurrence order and wrap, folded answers, hidden bodies/resources, bounded dynamic inputs and old-client/cache isolation; no dead memory helper import. |
| `apps/server/src/orchestration-v2/ThreadFind.ts` | SQL activity candidates and payload pruning, shared bounded summary parsing, opt-in cache identity and progressive/final acknowledgement; upstream memory deletion, transaction and named Effect operations retained. |
| `apps/web/src/components/chat/MessagesTimeline.browser.test.tsx` | 140-member virtualized activity navigation, clipped summary reveal, unaffected message highlights, legacy fallback/cleanup; concurrent approval highlight retains actions; upstream disposable helpers preserved. |
| `apps/web/src/components/chat/MessagesTimeline.logic.ts` | Selected member bypasses visibility filtering and opens containing active/settled/failed group; upstream streaming fast path and stable-row projection retained. |
| `apps/web/src/components/chat/MessagesTimeline.tsx` | Negotiated activity context and selected item passed through incremental projection; active item resolves to outer grouped detail row; upstream paging/restore/citation/audio/list optimizations retained. |
| `apps/web/src/components/chat/ThreadFindBar.browser.test.tsx` | Disposable real-component keyboard navigation, native button Enter, Escape and reopening/reset. |
| `apps/web/src/components/chat/ThreadFindBar.tsx` | Escape handling at bar boundary and searchable-summary description; upstream component variants, focus and layout preserved. |
| `apps/web/src/components/chat/TimelinePendingApprovalRow.tsx` | Additional v014 adaptation: optional source summary/item identity with active marker, without dropping approval response controls or normal detail presentation. |
| `apps/web/src/components/chat/TimelineWorkEntryRow.tsx` | Exact shared summary in find scopes, selected activity identity, beforematch clipping reveal, error summaries and approval forwarding; hidden inspector/detail bodies remain outside scopes. |
| `apps/web/src/components/chat/TimelineWorkGroupRows.tsx` | Pending-approval visibility combined with selected member; reasoning summaries while finding, nested initial/changed selection and single-member pin; append-follow suppressed during find. Existing effects retain reasons; new DOM positioning effect has its own reason. |
| `apps/web/src/components/chat/threadFindHighlights.browser.test.tsx` | Nested activity identity and original Unicode DOM bounds in addition to existing inline token matching. |
| `apps/web/src/components/chat/threadFindHighlights.ts` | Shared source ranges, nested item ownership, horizontal/vertical clip reveal and item-identity mutation invalidation; upstream cached painter retained. |
| `apps/web/src/components/chat/threadFindPosition.ts` | Visible nested member identity and viewport clipping, without selecting its outer group wrapper twice. |
| `apps/web/src/components/chat/timelineRowContext.ts` | Adds negotiated activity and active item fields; upstream pending approval and public/guest item-source context retained. |
| `apps/web/src/components/chat/useThreadFind.ts` | Requests activity, enables it only on acknowledgement and includes it in stable timeline equality; upstream local navigation/coalesced live refresh retained. |
| `apps/web/src/components/chat/useThreadFindNavigation.ts` | Scrolls nested group viewport before outer match positioning; existing async cancellation and bounded targeted page loading retained. |
| `apps/web/src/components/chat/useThreadFindPositionReader.ts` | Maps nested item, work/live/toggle and folded work anchors to server entry identity; existing scoped registry attachment retained. |
| `docs/internals/thread-find.md` | Negotiation, shared summary boundary, nested virtualization, Unicode offsets and positioning ownership. |
| `docs/user/keybindings.md` | Full-thread activity summary coverage, exclusions, Unicode matching, automatic history and older-server fallback. |
| `packages/contracts/src/orchestrationV2.ts` | Only optional `includeActivity` input and literal-true `activityIncluded` result; all v014 schema/transport work retained. |
| `packages/shared/src/threadFindText.ts` | Shared activity source summaries and setup/resource exclusions; upstream markdown/message/plan parsing unchanged. |
| `packages/shared/src/threadSearch.test.ts` | Compatibility expansion, combining accents, Hangul, ligatures and length-changing lowercase source ranges. |
| `packages/shared/src/threadSearch.ts` | NFKC/case-fold occurrence scanner and source-range mapping with ASCII fast path; no client full-history index. |

## Validation and integration handoff

No tests, dev servers, browser/device sessions, provider turns, repo-wide checks
or SDK changes were run. Historical v013 passed-test artifacts are not v014
qualification. `git diff --check HEAD` passed during replay.

Final source-only `git diff --check HEAD -- apps packages docs` and canonical
`git apply --reverse --check .tpatch/features/session-search/artifacts/post-apply.patch`
passed. A byte-level audit confirmed that the canonical patch exactly equals
`git diff --cached --binary HEAD` over the 23 paths, all recipe contents equal
their final source files, all preimages match the actual baseline, and the five
existing failed reconcile/resolution artifacts remain byte-identical.
Whole-tree whitespace checking reports one literal blank context line inside
the tracked unified patch artifact, not source whitespace; removing that space
would corrupt the patch context.

The first structural `tpatch verify session-search` found the missing provenance
sidecar (not a product test failure). It was corrected without running a provider.
The historical blocked reconcile outcome is intentionally retained as a warning,
not rewritten to claim that the failed automatic reconcile succeeded.
After binding provenance, `tpatch verify session-search` passed every blocking
check, including baseline recipe replay, patch replay and preimage freshness.
It also reports inherited later-touch warnings for `attention-inbox` on
`docs/user/keybindings.md` and `phase1-foundation` on
`packages/contracts/src/orchestrationV2.ts`. Those features have metadata but no
product replay in this clean worktree. This root changes neither feature;
the real preimage guards prevent overwriting their subsequently integrated bytes.
Lifecycle remains applied/needs-review for the coordinator's integrated tests,
not falsely marked test-passed from historical evidence.

Scoped formatting was attempted with
`git diff --name-only HEAD -- apps packages docs | xargs vp fmt`; it failed
because `vp` is absent from PATH and this worktree has no `node_modules`.
No dependencies were installed and no shared installation was changed.

After full integration, use the repository's Node/toolchain and run:

```sh
vp test run packages/shared/src/threadSearch.test.ts packages/shared/src/threadFindText.test.ts apps/server/src/orchestration-v2/ThreadFind.test.ts apps/web/src/components/chat/threadFindStore.test.ts apps/web/src/components/chat/MessagesTimeline.logic.test.ts apps/web/src/components/chat/threadFindHighlights.browser.test.tsx apps/web/src/components/chat/ThreadFindBar.browser.test.tsx apps/web/src/components/chat/MessagesTimeline.browser.test.tsx
git diff --name-only fed030d5cfba9b76789105d7f40933957d7b37cf HEAD -- apps packages docs | xargs vp fmt --check
git diff --name-only fed030d5cfba9b76789105d7f40933957d7b37cf HEAD -- apps packages | xargs vp lint
vp run --cache --parallel --concurrency-limit 4 --filter t3 --filter @t3tools/web --filter @t3tools/shared --filter @t3tools/contracts typecheck
```

For a narrower browser investigation, the new/extended case names are:
`reveals and highlights matching members without devirtualizing other activity groups`,
`keeps concurrent approvals actionable outside collapsed work and restores settled rows`,
and `navigates from the input, preserves native button Enter, and closes from a focused find control`.
Format/lint the exact path set above; typecheck only affected packages and the
relevant contract consumers using the existing filtered `vp run` tasks.
The coordinator owns any separately authorized integrated visual verification.
