import {
  ApprovalRequestId,
  AttentionId,
  EnvironmentId,
  EventId,
  ProjectId,
  ThreadId,
  type AttentionChange,
} from "@t3tools/contracts";
import { DEFAULT_CLIENT_SETTINGS, type ClientSettings } from "@t3tools/contracts/settings";
import type {
  AttentionWorkspaceState,
  EnvironmentAttentionState,
} from "@t3tools/client-runtime/state/attention";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  settings: null as ClientSettings | null,
  workspace: null as AttentionWorkspaceState | null,
  focused: false,
  active: { environmentId: "other", threadId: "other" },
  legacyApproval: false,
  navigate: vi.fn(),
  toast: vi.fn(() => "toast"),
  close: vi.fn(),
  badge: vi.fn(),
  sound: vi.fn(),
  throwDelivery: false,
}));
vi.mock("@effect/atom-react", () => ({
  useAtomValue: (atom: string) =>
    atom === "attention"
      ? mocks.workspace
      : {
          status: "live",
          snapshot: Option.some({
            threads: [
              {
                id: "thread",
                title: "SECRET THREAD",
                archivedAt: null,
                hasPendingApprovals: mocks.legacyApproval,
                hasPendingUserInput: false,
                session: null,
                latestTurn: { turnId: "turn", state: "running", completedAt: null },
              },
            ],
          }),
        },
}));
vi.mock("../state/attention", () => ({ attentionWorkspace: { valueAtom: "attention" } }));
vi.mock("../state/shell", () => ({ environmentShell: { stateValueAtom: () => "shell" } }));
vi.mock("../hooks/useSettings", () => ({
  useClientSettings: () => mocks.settings,
  getClientSettings: () => mocks.settings,
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => mocks.active,
}));
vi.mock("./ui/toast", () => ({ toastManager: { add: mocks.toast, close: mocks.close } }));
vi.mock("../threadNotifications", async (original) => ({
  ...(await original<typeof import("../threadNotifications")>()),
  playNotificationSound: mocks.sound,
  setNotificationBadge: mocks.badge,
  unlockNotificationAudio: vi.fn(),
}));
import { ThreadNotificationCoordinator } from "./ThreadNotificationCoordinator";

const A = EnvironmentId.make("env");
const B = EnvironmentId.make("other-env");
const item = (revision = 1, id = "a"): AttentionChange => ({
  key: `item:${id.repeat(64)}`,
  version: revision,
  entity: {
    type: "item",
    value: {
      attentionId: AttentionId.make(id.repeat(64)),
      projectId: ProjectId.make("project"),
      threadId: ThreadId.make("thread"),
      turnId: null,
      requestId: ApprovalRequestId.make("request"),
      kind: "approval",
      status: "open",
      reasonCode: revision > 1 ? "response_failed" : "approval_requested",
      revision,
      sourceSequence: revision,
      sourceEventId: EventId.make(`event-${revision}`),
      openedAt: "2026-09-29T00:00:00Z",
      updatedAt: "2026-09-29T00:00:00Z",
      resolvedAt: null,
    },
  },
});
function environment(
  changes: AttentionChange[] = [],
  status: EnvironmentAttentionState["status"] = "live",
): EnvironmentAttentionState {
  const entries = HashMap.fromIterable(changes.map((entry) => [entry.key, entry] as const));
  return { status, hasSnapshot: true, entries, reason: null, notificationCandidates: entries };
}
function setEnvironment(
  changes: AttentionChange[],
  status: EnvironmentAttentionState["status"] = "live",
  environmentId = A,
) {
  const environments = new Map(mocks.workspace?.environments);
  environments.set(environmentId, environment(changes, status));
  mocks.workspace = { isReady: true, environments };
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
    if (mocks.throwDelivery) throw new Error("Platform failure");
    TestNotification.sent.push(this);
  }
}
let renderer: ReactTestRenderer | undefined;
async function render() {
  await act(async () => {
    if (renderer) renderer.update(<ThreadNotificationCoordinator />);
    else renderer = create(<ThreadNotificationCoordinator />);
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.settings = { ...DEFAULT_CLIENT_SETTINGS, notificationMode: "notifications" };
  mocks.workspace = { isReady: true, environments: new Map([[A, environment()]]) };
  mocks.focused = false;
  mocks.active = { environmentId: "other", threadId: "other" };
  mocks.legacyApproval = false;
  mocks.throwDelivery = false;
  TestNotification.permission = "granted";
  TestNotification.sent = [];
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("Notification", TestNotification);
  vi.stubGlobal(
    "window",
    Object.assign(new EventTarget(), { focus: vi.fn(), isSecureContext: true }),
  );
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { visibilityState: "visible", hasFocus: () => mocks.focused }),
  );
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = undefined;
  vi.unstubAllGlobals();
});
describe("canonical notification presentation", () => {
  it("deduplicates material revisions, suppresses the parallel shell detector and keeps OS payloads static", async () => {
    await render();
    mocks.legacyApproval = true;
    setEnvironment([item()]);
    await render();
    await render();
    expect(TestNotification.sent).toHaveLength(1);
    setEnvironment([item(2)]);
    await render();
    expect(TestNotification.sent).toHaveLength(2);
    expect(TestNotification.sent[0]?.close).toHaveBeenCalled();
    expect(TestNotification.sent[1]?.options).toEqual({
      body: "Open the owning thread in T3 Code to review its current state.",
      tag: "env:thread",
      silent: true,
    });
    expect(
      JSON.stringify(TestNotification.sent.map((notification) => notification.options)),
    ).not.toContain("SECRET");
    expect(mocks.badge).toHaveBeenLastCalledWith(1);
  });
  it("does not notify canonical cache entries without accepted live eligibility", async () => {
    const snapshot = environment([item()]);
    mocks.workspace = {
      isReady: true,
      environments: new Map([[A, { ...snapshot, notificationCandidates: HashMap.empty() }]]),
    };
    await render();
    setEnvironment([item()], "syncing");
    await render();
    mocks.workspace = {
      isReady: true,
      environments: new Map([[A, { ...snapshot, notificationCandidates: HashMap.empty() }]]),
    };
    await render();
    expect(TestNotification.sent).toHaveLength(0);
  });
  it.each(["off", "muted", "category", "quiet"] as const)(
    "consumes %s events without replay after policy changes",
    async (policy) => {
      await render();
      mocks.settings = {
        ...DEFAULT_CLIENT_SETTINGS,
        notificationMode: policy === "off" ? "off" : "notifications",
        notificationMutedEnvironments: policy === "muted" ? [A] : [],
        notificationCategories:
          policy === "category" ? [] : DEFAULT_CLIENT_SETTINGS.notificationCategories,
        notificationQuietHours: { enabled: policy === "quiet", start: "00:00", end: "00:00" },
      };
      setEnvironment([item()]);
      await render();
      expect(TestNotification.sent).toHaveLength(0);
      mocks.settings = { ...DEFAULT_CLIENT_SETTINGS, notificationMode: "notifications" };
      await render();
      expect(TestNotification.sent).toHaveLength(0);
      setEnvironment([item(2)]);
      await render();
      expect(TestNotification.sent).toHaveLength(1);
      mocks.settings = { ...DEFAULT_CLIENT_SETTINGS, notificationMode: "off" };
      await render();
      expect(TestNotification.sent[0]?.close).toHaveBeenCalled();
      expect(mocks.badge).toHaveBeenLastCalledWith(0);
    },
  );
  it("silences the focused active thread on every channel but allows another scoped thread", async () => {
    mocks.settings = {
      ...DEFAULT_CLIENT_SETTINGS,
      notificationMode: "notifications-and-sound",
      inAppNotificationsEnabled: true,
    };
    mocks.focused = true;
    mocks.active = { environmentId: A, threadId: "thread" };
    await render();
    setEnvironment([item()]);
    await render();
    expect(mocks.sound).not.toHaveBeenCalled();
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(TestNotification.sent).toHaveLength(0);
    setEnvironment([item()], "live", B);
    await render();
    expect(mocks.sound).toHaveBeenCalledOnce();
    expect(mocks.toast).toHaveBeenCalledOnce();
    expect(TestNotification.sent).toHaveLength(0);
    const shouldPlay = mocks.sound.mock.calls[0]?.[1];
    mocks.settings = { ...mocks.settings, notificationMutedEnvironments: [B] };
    expect(shouldPlay()).toBe(false);
  });
  it.each(["denied", "unsupported", "throws", "error"] as const)(
    "reports %s delivery without disabling the inbox or retrying duplicates",
    async (failure) => {
      await render();
      if (failure === "denied") TestNotification.permission = "denied";
      if (failure === "unsupported") vi.stubGlobal("Notification", undefined);
      if (failure === "throws") mocks.throwDelivery = true;
      setEnvironment([item()]);
      await render();
      if (failure === "error") TestNotification.sent[0]?.dispatchEvent(new Event("error"));
      await render();
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Notification delivery unavailable" }),
      );
      expect(mocks.workspace?.environments.get(A)?.entries).toBeDefined();
      expect(mocks.badge).toHaveBeenLastCalledWith(0);
    },
  );
  it("routes same local thread IDs to their owning environments, including stale and revoked destinations", async () => {
    await render();
    setEnvironment([item()]);
    setEnvironment([item()], "live", B);
    await render();
    expect(TestNotification.sent).toHaveLength(2);
    await act(async () => TestNotification.sent[1]?.dispatchEvent(new Event("click")));
    expect(mocks.navigate).toHaveBeenLastCalledWith({
      to: "/$environmentId/$threadId",
      params: { environmentId: B, threadId: "thread" },
    });
    setEnvironment([item()], "stale", B);
    await render();
    await act(async () => TestNotification.sent[1]?.dispatchEvent(new Event("click")));
    expect(mocks.navigate).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Environment disconnected" }),
    );
    setEnvironment([], "unauthorized", A);
    await render();
    await act(async () => TestNotification.sent[0]?.dispatchEvent(new Event("click")));
    expect(mocks.navigate).toHaveBeenLastCalledWith({ to: "/attention" });
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Notification destination unavailable" }),
    );
  });
});
