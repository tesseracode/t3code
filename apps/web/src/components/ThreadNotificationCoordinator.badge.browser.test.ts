import { WORKING_EXIT_GRACE_MS } from "@t3tools/client-runtime/state/thread-inbox";
import type { AnyRouter } from "@tanstack/react-router";
import {
  ApprovalRequestId,
  AttentionId,
  EnvironmentId,
  EventId,
  ProjectId,
  ThreadId,
  TurnId,
  type AttentionChange,
} from "@t3tools/contracts";
import { DEFAULT_CLIENT_SETTINGS, type ClientSettings } from "@t3tools/contracts/settings";
import type { EnvironmentAttentionState } from "@t3tools/client-runtime/state/attention";
import * as DateTime from "effect/DateTime";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import { Atom, AtomRegistry } from "effect/reactivity";
import { expect, it, vi } from "vite-plus/test";

import { fakeTimers, stubGlobal } from "../../test/render";

const state = vi.hoisted(() => ({
  mode: "notifications",
  policy: {} as Partial<ClientSettings>,
  active: {} as { environmentId?: string; threadId?: string },
  inApp: false,
  toast: vi.fn(),
  closeToast: vi.fn(),
  shells: null as unknown as { set: (id: string, value: unknown) => void },
  navigate: vi.fn(),
  sound: vi.fn(),
  badge: vi.fn(),
  settingsListeners: new Set<() => void>(),
}));
vi.mock(import("./ui/toast"), async (original) => {
  const actual = await original();
  return {
    ...actual,
    toastManager: { ...actual.toastManager, add: state.toast as never, close: state.closeToast },
  };
});
vi.mock(import("../state/attention"), () => ({
  attentionWorkspace: {
    get valueAtom() {
      return attentionAtom;
    },
  } as never,
}));
vi.mock(import("../state/shell"), async (original) => {
  const actual = await original();
  return {
    ...actual,
    environmentShell: {
      ...actual.environmentShell,
      stateValueAtom: ((id: string) => shellAtom(id)) as never,
    },
  };
});
vi.mock(import("../state/presentation"), async (original) => {
  const actual = await original();
  return {
    ...actual,
    environmentSummaries: {
      ...actual.environmentSummaries,
      // Read lazily: the factory runs before this module's own bindings exist.
      get environmentIdsAtom() {
        return environmentIdsAtom as never;
      },
    },
  };
});
vi.mock(import("../hooks/useSettings"), async (original) => ({
  ...(await original()),
  subscribeClientSettings: ((listener: () => void) => {
    state.settingsListeners.add(listener);
    return () => state.settingsListeners.delete(listener);
  }) as never,
  getClientSettings: (() => ({
    ...DEFAULT_CLIENT_SETTINGS,
    ...state.policy,
    notificationMode: state.mode,
    inAppNotificationsEnabled: state.inApp,
  })) as never,
}));
vi.mock(import("../threadNotifications"), async (original) => ({
  ...(await original()),
  playNotificationSound: state.sound,
  unlockNotificationAudio: vi.fn(),
  setNotificationBadge: state.badge,
}));

import { startThreadNotifications } from "./ThreadNotificationCoordinator";

let registry: AtomRegistry.AtomRegistry;
const shellAtom = Atom.family((_id: string) => Atom.make<unknown>(null));
const environmentIdsAtom = Atom.make<ReadonlyArray<string>>([]);
const attentionAtom = Atom.make({
  environments: new Map<EnvironmentId, EnvironmentAttentionState>(),
});
state.shells = { set: (id, value) => registry.set(shellAtom(id), value) };

function attentionEnvironment(
  changes: AttentionChange[] = [],
  status: EnvironmentAttentionState["status"] = "live",
): EnvironmentAttentionState {
  const entries = HashMap.fromIterable(changes.map((change) => [change.key, change] as const));
  return { status, hasSnapshot: true, entries, reason: null, notificationCandidates: entries };
}

function setAttention(
  id: string,
  changes: AttentionChange[],
  status: EnvironmentAttentionState["status"] = "live",
  eligible = true,
) {
  const environments = new Map(registry.get(attentionAtom).environments);
  const value = attentionEnvironment(changes, status);
  environments.set(
    EnvironmentId.make(id),
    eligible ? value : { ...value, notificationCandidates: HashMap.empty() },
  );
  registry.set(attentionAtom, { environments });
}

function approval(revision = 1, kind: "approval" | "failure" = "approval"): AttentionChange {
  return {
    key: `item:${"a".repeat(64)}`,
    version: revision,
    entity: {
      type: "item",
      value: {
        attentionId: AttentionId.make("a".repeat(64)),
        projectId: ProjectId.make("project"),
        threadId: ThreadId.make("thread"),
        status: "open",
        ...(kind === "failure"
          ? {
              kind,
              turnId: TurnId.make("turn"),
              title: "Agent failed",
              requestId: null,
              reasonCode: "provider_failed",
            }
          : {
              kind,
              turnId: null,
              requestId: ApprovalRequestId.make("request"),
              reasonCode: revision === 1 ? "approval_requested" : "response_failed",
            }),
        revision,
        sourceSequence: revision,
        sourceEventId: EventId.make(`event-${revision}`),
        openedAt: "2026-09-29T00:00:00Z",
        updatedAt: "2026-09-29T00:00:00Z",
        resolvedAt: null,
      },
    },
  };
}

function summary(version: number, phase: "running" | "completed", runId = "turn"): AttentionChange {
  return {
    key: "summary:thread",
    version,
    entity: {
      type: "summary",
      value: {
        threadId: ThreadId.make("thread"),
        projectId: ProjectId.make("project"),
        turnId: TurnId.make(runId),
        phase,
        revision: version,
        approvalCount: 0,
        inputCount: 0,
        failureCount: 0,
        disconnectCount: 0,
        countsOverflowed: false,
        sourceEventId: EventId.make(`event-${version}`),
        sourceSequence: version,
        updatedAt: "2026-09-29T00:00:00Z",
      },
    },
  };
}

class TestNotification extends EventTarget {
  static permission = "granted";
  static sent: TestNotification[] = [];
  close = vi.fn();
  get tag() {
    return this.options.tag ?? "";
  }
  constructor(
    readonly title: string,
    readonly options: NotificationOptions,
  ) {
    super();
    TestNotification.sent.push(this);
  }
}

const thread = {
  id: "thread",
  title: "Test thread",
  archivedAt: null as string | null,
  hasPendingApprovals: false,
  hasPendingUserInput: false,
  errorClass: null as "usage_limit" | null,
  pendingGuestMessageCount: 0,
  session: null as { status: string } | null,
  latestTurn: { turnId: "turn", state: "running", completedAt: null as string | null },
};
let focused = false;
let visibility = "visible";

const SHELL_NOW = DateTime.makeUnsafe("2026-09-13T07:00:00.000Z");

function toV2ThreadShell(input: typeof thread) {
  const latestTurn = input.latestTurn;
  return {
    id: input.id,
    projectId: "project",
    title: input.title,
    providerInstanceId: "codex",
    modelSelection: { instanceId: "codex", model: "gpt-5.4" },
    runtimeMode: "full-access",
    interactionMode: "default",
    branch: null,
    worktreePath: null,
    activeProviderThreadId: null,
    lineage: {
      rootThreadId: input.id,
      parentThreadId: null,
      relationshipToParent: null,
    },
    forkedFrom: null,
    createdBy: "user",
    creationSource: "web",
    latestRunId: latestTurn.turnId,
    activeRunId: null,
    status:
      latestTurn.state === "completed"
        ? "completed"
        : latestTurn.state === "error" || input.session?.status === "error"
          ? "failed"
          : "running",
    pendingRuntimeRequest: input.hasPendingUserInput
      ? { id: "request-1", kind: "user_input", createdAt: SHELL_NOW }
      : input.hasPendingApprovals
        ? { id: "request-1", kind: "command", createdAt: SHELL_NOW }
        : null,
    lastErrorClass: input.errorClass,
    pendingGuestMessageCount: input.pendingGuestMessageCount,
    latestVisibleMessage: null,
    latestUserMessageAt: null,
    hasActionableProposedPlan: false,
    itemCount: 0,
    visibleItemCount: 0,
    createdAt: SHELL_NOW,
    updatedAt: SHELL_NOW,
    latestRunRequestedAt: SHELL_NOW,
    latestRunStartedAt: SHELL_NOW,
    latestRunCompletedAt: latestTurn.completedAt
      ? DateTime.makeUnsafe(latestTurn.completedAt)
      : undefined,
    archivedAt: input.archivedAt ? DateTime.makeUnsafe(input.archivedAt) : null,
    settledOverride: null,
    settledAt: null,
    lastVisitedAt: null,
    deletedAt: null,
  };
}

function shell(overrides: Partial<typeof thread> = {}, ...others: Partial<typeof thread>[]) {
  return {
    status: "live",
    snapshot: Option.some({
      threads: [overrides, ...others].map((override) =>
        toV2ThreadShell({ ...thread, ...override }),
      ),
    }),
  };
}
// The mocked modules read `state` and the focus flags, so every test resets them before
// starting the service.
function setup() {
  vi.clearAllMocks();
  const stack = new AsyncDisposableStack();
  registry = AtomRegistry.make();
  const testRegistry = registry;
  stack.defer(() => testRegistry.dispose());
  state.mode = "notifications";
  state.policy = {};
  state.active = {};
  state.inApp = false;
  state.toast.mockImplementation(() => `toast-${state.toast.mock.calls.length}`);
  state.settingsListeners.clear();
  registry.set(environmentIdsAtom, ["one", "two"]);
  registry.set(attentionAtom, {
    environments: new Map([
      [EnvironmentId.make("one"), attentionEnvironment([], "unsupported")],
      [EnvironmentId.make("two"), attentionEnvironment([], "unsupported")],
    ]),
  });
  state.shells.set("one", shell());
  state.shells.set("two", shell());
  focused = false;
  visibility = "visible";
  TestNotification.permission = "granted";
  TestNotification.sent = [];
  stack.use(stubGlobal("Notification", TestNotification));
  stack.use(vi.spyOn(window, "focus").mockImplementation(() => undefined));
  stack.use(vi.spyOn(document, "hasFocus").mockImplementation(() => focused));
  stack.use(
    vi
      .spyOn(document, "visibilityState", "get")
      .mockImplementation(() => visibility as DocumentVisibilityState),
  );
  const router = {
    state: {
      matches: [
        {
          get params() {
            return state.active;
          },
        },
      ],
    },
    navigate: state.navigate,
  } as unknown as AnyRouter;
  return {
    start: () => {
      stack.defer(startThreadNotifications(testRegistry, router));
    },
    setEnvironmentIds: (ids: ReadonlyArray<string>) => testRegistry.set(environmentIdsAtom, ids),
    changeSettings: () => {
      for (const listener of state.settingsListeners) listener();
    },
    [Symbol.asyncDispose]: () => stack.disposeAsync(),
  };
}

it.each(["hasPendingApprovals", "hasPendingUserInput"] as const)(
  "badges %s and clears when notifications are disabled",
  async (flag) => {
    await using app = setup();
    app.start();
    state.shells.set("one", shell({ [flag]: true }));
    expect(state.badge).toHaveBeenLastCalledWith(1);
    const notification = TestNotification.sent[0]!;
    notification.dispatchEvent(new Event("click"));
    expect(state.navigate).toHaveBeenCalledWith({
      to: "/$environmentId/$threadId",
      params: { environmentId: EnvironmentId.make("one"), threadId: "thread" },
    });
    state.mode = "sound";
    app.changeSettings();
    expect(state.badge).toHaveBeenLastCalledWith(0);
    expect(notification.close).toHaveBeenCalled();
  },
);

it("holds a completion through a continuation gap and notifies once it settles", async () => {
  await using app = setup();
  app.start();
  using _timers = fakeTimers();
  const finished = (turnId: string, completedAt: string) => ({
    latestTurn: { turnId, state: "completed", completedAt },
  });
  state.shells.set("one", shell(finished("turn-1", "2026-09-13T07:00:01.000Z")));
  state.shells.set(
    "one",
    shell({ latestTurn: { turnId: "turn-2", state: "running", completedAt: null } }),
  );
  state.shells.set("one", shell(finished("turn-2", "2026-09-13T07:00:02.000Z")));
  expect(TestNotification.sent).toEqual([]);
  await vi.advanceTimersByTimeAsync(WORKING_EXIT_GRACE_MS - 1);
  expect(TestNotification.sent).toEqual([]);
  await vi.advanceTimersByTimeAsync(1);
  expect(TestNotification.sent.map((sent) => sent.title)).toEqual(["Thread completed"]);
});

it("deduplicates canonical revisions, silences the parallel shell detector and keeps payloads static", async () => {
  await using app = setup();
  setAttention("one", []);
  app.start();
  state.shells.set("one", shell({ hasPendingApprovals: true }));
  expect(TestNotification.sent).toEqual([]);
  setAttention("one", [approval()]);
  setAttention("one", [approval()]);
  expect(TestNotification.sent).toHaveLength(1);
  expect(TestNotification.sent[0]?.options.body).toBe(
    "Open the owning thread in T3 Code to review its current state.",
  );
  expect(JSON.stringify(TestNotification.sent[0]?.options)).not.toContain("Test thread");
  setAttention("one", [approval(2)]);
  expect(TestNotification.sent).toHaveLength(2);
  expect(TestNotification.sent[0]?.close).toHaveBeenCalled();
});

it("never replays cache or suppressed policy revisions when notifications are enabled", async () => {
  await using app = setup();
  setAttention("one", [approval()], "live", false);
  app.start();
  expect(TestNotification.sent).toEqual([]);
  state.mode = "off";
  app.changeSettings();
  setAttention("one", [approval(2)]);
  state.mode = "notifications";
  app.changeSettings();
  setAttention("one", [approval(2)]);
  expect(TestNotification.sent).toEqual([]);
  setAttention("one", [approval(3)]);
  expect(TestNotification.sent).toHaveLength(1);
  state.policy = { notificationMutedEnvironments: [EnvironmentId.make("one")] };
  app.changeSettings();
  expect(TestNotification.sent[0]?.close).toHaveBeenCalled();
  expect(state.badge).toHaveBeenLastCalledWith(0);
});

it("silences every channel for the focused active thread but not another owning environment", async () => {
  await using app = setup();
  state.mode = "notifications-and-sound";
  state.inApp = true;
  state.active = { environmentId: "one", threadId: "thread" };
  focused = true;
  setAttention("one", []);
  setAttention("two", []);
  app.start();
  setAttention("one", [approval()]);
  expect(state.sound).not.toHaveBeenCalled();
  expect(state.toast).not.toHaveBeenCalled();
  expect(TestNotification.sent).toEqual([]);
  setAttention("two", [approval()]);
  expect(state.sound).toHaveBeenCalledTimes(1);
  expect(state.toast).toHaveBeenCalledTimes(1);
  expect(state.toast.mock.calls[0]?.[0]).toMatchObject({
    title: "Approval needed",
    description: "Open the owning thread in T3 Code to review its current state.",
  });
});

it("keeps notification clicks scoped and offers retry for disconnected destinations", async () => {
  await using app = setup();
  setAttention("one", []);
  setAttention("two", []);
  app.start();
  setAttention("one", [approval()]);
  setAttention("two", [approval()]);
  const first = TestNotification.sent[0]!;
  const second = TestNotification.sent[1]!;
  second.dispatchEvent(new Event("click"));
  expect(state.navigate).toHaveBeenLastCalledWith({
    to: "/$environmentId/$threadId",
    params: { environmentId: "two", threadId: "thread" },
  });
  state.navigate.mockClear();
  setAttention("one", [], "stale");
  first.dispatchEvent(new Event("click"));
  expect(state.navigate).not.toHaveBeenCalled();
  expect(state.toast).toHaveBeenLastCalledWith(
    expect.objectContaining({
      title: "Environment disconnected",
      actionProps: expect.objectContaining({ children: "Retry open thread" }),
    }),
  );
  const retry = state.toast.mock.calls.at(-1)?.[0]?.actionProps.onClick;
  setAttention("one", []);
  retry();
  expect(state.navigate).toHaveBeenLastCalledWith({
    to: "/$environmentId/$threadId",
    params: { environmentId: "one", threadId: "thread" },
  });
  setAttention("one", [], "unauthorized");
  first.dispatchEvent(new Event("click"));
  expect(state.navigate).toHaveBeenLastCalledWith({ to: "/attention" });
  app.setEnvironmentIds([]);
  expect(second.close).toHaveBeenCalled();
  expect(state.badge).toHaveBeenLastCalledWith(0);
});

it.each(["shell-first", "canonical-first", "after-grace"] as const)(
  "joins canonical completion to the upstream grace gate with %s delivery",
  async (order) => {
    await using app = setup();
    using _timers = fakeTimers();
    setAttention("one", []);
    app.start();
    if (order === "canonical-first") setAttention("one", [summary(1, "completed")]);
    state.shells.set(
      "one",
      shell({
        latestTurn: { turnId: "turn", state: "completed", completedAt: "2026-09-13T07:00:01Z" },
      }),
    );
    if (order === "shell-first") setAttention("one", [summary(1, "completed")]);
    expect(TestNotification.sent).toEqual([]);
    await vi.advanceTimersByTimeAsync(WORKING_EXIT_GRACE_MS);
    if (order === "after-grace") {
      expect(TestNotification.sent).toEqual([]);
      setAttention("one", [summary(1, "completed")]);
    }
    expect(TestNotification.sent.map((entry) => entry.title)).toEqual(["Thread completed"]);
    setAttention("one", [summary(2, "completed")]);
    expect(TestNotification.sent).toHaveLength(1);
  },
);

it("cancels a canonical completion when the orchestrator continues before the grace ends", async () => {
  await using app = setup();
  using _timers = fakeTimers();
  setAttention("one", []);
  app.start();
  state.shells.set(
    "one",
    shell({
      latestTurn: { turnId: "turn", state: "completed", completedAt: "2026-09-13T07:00:01Z" },
    }),
  );
  setAttention("one", [summary(1, "completed")]);
  state.shells.set(
    "one",
    shell({
      latestTurn: { turnId: "next", state: "running", completedAt: null },
    }),
  );
  setAttention("one", [summary(2, "running", "next")]);
  await vi.advanceTimersByTimeAsync(WORKING_EXIT_GRACE_MS);
  expect(TestNotification.sent).toEqual([]);
});

it.each(["canonical-first", "limited-first"] as const)(
  "retains usage-limit alerts without duplicating a canonical failure (%s)",
  async (order) => {
    await using app = setup();
    setAttention("one", []);
    app.start();
    if (order === "canonical-first") setAttention("one", [approval(1, "failure")]);
    state.shells.set(
      "one",
      shell({
        errorClass: "usage_limit",
        latestTurn: { turnId: "turn", state: "error", completedAt: "2026-09-13T07:00:01Z" },
      }),
    );
    if (order === "limited-first") setAttention("one", [approval(1, "failure")]);
    expect(TestNotification.sent).toHaveLength(1);
    expect(TestNotification.sent[0]?.title).toBe(
      order === "limited-first" ? "Usage limit reached" : "Thread failed",
    );
    setAttention("one", [approval(2, "failure")]);
    expect(TestNotification.sent).toHaveLength(2);
  },
);

it("retains upstream guest-request alerts on canonical-capable environments", async () => {
  await using app = setup();
  setAttention("one", []);
  app.start();
  state.shells.set("one", shell({ pendingGuestMessageCount: 1 }));
  expect(TestNotification.sent.map((entry) => entry.title)).toEqual(["Guest request"]);
});
