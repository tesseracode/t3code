import { describe, expect, it } from "vite-plus/test";
import {
  ApprovalRequestId,
  AttentionId,
  EnvironmentId,
  EventId,
  ProjectId,
  ThreadId,
  type AttentionChange,
} from "@t3tools/contracts";
import * as HashMap from "effect/HashMap";
import * as Schema from "effect/Schema";
import {
  aggregateAttention,
  type AttentionWorkspaceState,
  type ScopedAttentionItem,
} from "@t3tools/client-runtime/state/attention";
import { KeybindingRule } from "@t3tools/contracts";
import {
  DEFAULT_RESOLVED_KEYBINDINGS,
  compileResolvedKeybindingsConfig,
} from "@t3tools/shared/keybindings";
import { resolveShortcutCommand } from "../../keybindings";
import {
  ATTENTION_INBOX_COMMAND,
  ATTENTION_SEEN_LIMIT,
  AttentionSeen,
  EMPTY_ATTENTION_FILTERS,
  attentionBadge,
  attentionKeyboardIndex,
  attentionThreadTarget,
  filterAttentionInbox,
  markAttentionSeen,
  pruneAttentionSeen,
} from "./attentionInbox.logic";

const A = EnvironmentId.make("machine-a");
const B = EnvironmentId.make("machine-b");
const isAttentionSeen = Schema.is(AttentionSeen);
const decodeKeybindingRule = Schema.decodeUnknownSync(KeybindingRule);
function row(index: number, environmentId = A): ScopedAttentionItem {
  const threadId = ThreadId.make(`thread-${Math.floor(index / 2)}`);
  const item = {
    attentionId: AttentionId.make(index.toString(16).padStart(64, "0")),
    projectId: ProjectId.make(index % 2 === 0 ? "repo-one" : "repo-two"),
    threadId,
    turnId: null,
    requestId: ApprovalRequestId.make(`request-${index}`),
    kind: index % 2 === 0 ? ("approval" as const) : ("user_input" as const),
    status: "open" as const,
    reasonCode: "approval_requested" as const,
    revision: 1,
    sourceEventId: EventId.make(`event-${index}`),
    sourceSequence: index,
    openedAt: "2026-09-28T00:00:00Z",
    updatedAt: "2026-09-28T00:00:00Z",
    resolvedAt: null,
  };
  return {
    key: `${environmentId}:${item.attentionId}`,
    ref: { environmentId, threadId },
    item,
    stale: false,
    priority: "blocking-error",
  };
}
function workspace(count: number, stale = false): AttentionWorkspaceState {
  return {
    isReady: true,
    environments: new Map(
      [A, B].map((environmentId) => {
        const entries = Array.from({ length: count }, (_, index) => {
          const { item } = row(index, environmentId);
          const key = `item:${item.attentionId}`;
          const change: AttentionChange = {
            key,
            version: index,
            entity: { type: "item", value: item },
          };
          return [key, change] as const;
        });
        return [
          environmentId,
          {
            status: stale && environmentId === B ? "stale" : "live",
            hasSnapshot: true,
            entries: HashMap.fromIterable(entries),
            reason: null,
          },
        ];
      }),
    ),
  };
}

describe("attention inbox semantics", () => {
  it("keeps colliding IDs, routing and filtered counts scoped across a realistic large list", () => {
    const state = workspace(2_500);
    const all = aggregateAttention(state);
    expect(all.itemCount).toBe(5_000);
    expect(all.threadCount).toBe(2_500);
    const selected = filterAttentionInbox(all, {
      ...EMPTY_ATTENTION_FILTERS,
      project: `${B}:repo-one`,
      kind: "approval",
      priority: "blocking-error",
    });
    expect(selected.items).toHaveLength(1_250);
    expect(selected.threadCount).toBe(1_250);
    expect(new Set(selected.items.map((item) => item.ref.environmentId))).toEqual(new Set([B]));
    expect(attentionThreadTarget(row(0, A))).toEqual({
      to: "/$environmentId/$threadId",
      params: { environmentId: A, threadId: "thread-0" },
    });
    expect(attentionThreadTarget({ ...row(0, B), stale: true }).params.environmentId).toBe(B);
    expect(
      filterAttentionInbox(all, { ...EMPTY_ATTENTION_FILTERS, environment: "missing" }).items,
    ).toEqual([]);
    expect(
      filterAttentionInbox(all, { ...EMPTY_ATTENTION_FILTERS, priority: "warning" }).items,
    ).toEqual([]);
  });
  it("distinguishes partial/stale badge totals from a complete zero", () => {
    expect(attentionBadge(aggregateAttention(workspace(2, true)))).toEqual({
      text: "2?",
      label: "2 actionable threads known; total incomplete. 1 stale.",
    });
    expect(attentionBadge(aggregateAttention(workspace(0))).text).toBe("0");
    expect(
      attentionBadge(aggregateAttention({ isReady: false, environments: new Map() })).text,
    ).toBe("0?");
  });
  it("marks revisions seen and unseen without changing canonical items or counts", () => {
    const state = workspace(2);
    const before = aggregateAttention(state);
    const target = row(0);
    let seen = markAttentionSeen([], target, true);
    expect(seen).toEqual([{ key: target.key, environmentId: A, revision: 1 }]);
    seen = markAttentionSeen(seen, target, true);
    expect(seen).toHaveLength(1);
    const revised = { ...target, item: { ...target.item, revision: 2 } };
    expect(seen[0]?.revision).not.toBe(revised.item.revision);
    seen = markAttentionSeen(seen, revised, true);
    expect(seen[0]?.revision).toBe(2);
    expect(markAttentionSeen(seen, revised, false)).toEqual([]);
    expect(aggregateAttention(state)).toEqual(before);
  });
  it("retains at most 2000 most recently marked scoped revisions", () => {
    let seen = Array.from({ length: ATTENTION_SEEN_LIMIT }, (_, index) => ({
      key: row(index).key,
      environmentId: A,
      revision: 1,
    }));
    seen = [...markAttentionSeen(seen, row(0), true)];
    seen = [...markAttentionSeen(seen, row(ATTENTION_SEEN_LIMIT), true)];
    expect(seen).toHaveLength(ATTENTION_SEEN_LIMIT);
    expect(seen[0]?.key).toBe(row(2).key);
    expect(seen.at(-2)?.key).toBe(row(0).key);
    expect(isAttentionSeen(seen)).toBe(true);
    expect(isAttentionSeen([...seen, seen[0]])).toBe(false);
  });
  it("prunes only complete authoritative absence, removal or revocation, never partial/stale caches", () => {
    const state = workspace(2);
    const a = row(5);
    const b = row(5, B);
    const seen = markAttentionSeen(markAttentionSeen([], a, true), b, true);
    const observed = new Set([A, B]);
    expect(pruneAttentionSeen(seen, { ...state, isReady: false }, observed)).toBe(seen);
    expect(pruneAttentionSeen(seen, { isReady: true, environments: new Map() }, new Set())).toBe(
      seen,
    );
    const disconnected = new Map(state.environments);
    for (const [id, value] of disconnected)
      disconnected.set(id, { ...value, status: id === A ? "syncing" : "stale" });
    expect(pruneAttentionSeen(seen, { ...state, environments: disconnected }, observed)).toBe(seen);
    expect(pruneAttentionSeen(seen, state, observed)).toEqual([]);
    disconnected.delete(A);
    expect(pruneAttentionSeen(seen, { ...state, environments: disconnected }, observed)).toEqual([
      seen[1],
    ]);
    const current = disconnected.get(B)!;
    disconnected.set(B, { ...current, status: "unauthorized" });
    expect(pruneAttentionSeen(seen, { ...state, environments: disconnected }, observed)).toEqual(
      [],
    );
  });
  it("bounds keyboard selection and supports Home/End without truncating large lists", () => {
    expect(attentionKeyboardIndex("End", 0, 5_000)).toBe(4_999);
    expect(attentionKeyboardIndex("ArrowDown", 4_999, 5_000)).toBe(4_999);
    expect(attentionKeyboardIndex("Home", 4_999, 5_000)).toBe(0);
    expect(attentionKeyboardIndex("ArrowUp", 0, 5_000)).toBe(0);
    expect(attentionKeyboardIndex("ArrowDown", 0, 0)).toBeNull();
    expect(attentionKeyboardIndex("Enter", 2, 5_000)).toBeNull();
  });
  it("accepts the configurable inbox command without assigning a default shortcut", () => {
    const rule = decodeKeybindingRule({
      command: ATTENTION_INBOX_COMMAND,
      key: "mod+shift+i",
    });
    expect(rule.command).toBe(ATTENTION_INBOX_COMMAND);
    expect(
      DEFAULT_RESOLVED_KEYBINDINGS.some((entry) => entry.command === ATTENTION_INBOX_COMMAND),
    ).toBe(false);
    const bindings = compileResolvedKeybindingsConfig([rule]);
    expect(
      resolveShortcutCommand(
        {
          key: "i",
          metaKey: true,
          ctrlKey: false,
          shiftKey: true,
          altKey: false,
        },
        bindings,
        { platform: "MacIntel" },
      ),
    ).toBe(ATTENTION_INBOX_COMMAND);
  });
});
