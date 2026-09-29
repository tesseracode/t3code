import {
  ApprovalRequestId,
  AttentionDeliveryCursor,
  AttentionId,
  AttentionPageToken,
  AttentionSyncError,
  DEFAULT_SERVER_SETTINGS,
  EnvironmentAuthorizationError,
  EnvironmentId,
  EventId,
  ProjectId,
  ThreadId,
  TurnId,
  WS_METHODS,
  type AttentionChange,
  type AttentionStreamMessage,
  type AttentionSubscribeInput,
  type ServerConfig,
  type ThreadAttentionItem,
} from "@t3tools/contracts";
import { describe, expect, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";
import * as TestClock from "effect/testing/TestClock";
import * as RpcClientError from "effect/unstable/rpc/RpcClientError";
import type { ConnectionCatalogEntry } from "../connection/catalog.ts";
import {
  AVAILABLE_CONNECTION_STATE,
  ConnectionBlockedError,
  PrimaryConnectionTarget,
  type PreparedConnection,
  type NetworkStatus,
  type SupervisorConnectionState,
} from "../connection/model.ts";
import { EnvironmentRegistry, EnvironmentNotRegisteredError } from "../connection/registry.ts";
import { EnvironmentSupervisor } from "../connection/supervisor.ts";
import type { EnvironmentRpcStreamFailure } from "../rpc/client.ts";
import type { WsRpcProtocolClient } from "../rpc/protocol.ts";
import type { RpcSession } from "../rpc/session.ts";
import {
  aggregateAttention,
  emptyEnvironmentAttention,
  makeAttentionWorkspaceState,
  selectAttentionRelayHints,
  type AttentionWorkspaceState,
  type EnvironmentAttentionState,
} from "./attention.ts";

const A = EnvironmentId.make("a");
const B = EnvironmentId.make("b");
const threadId = ThreadId.make("same-thread");
const projectId = ProjectId.make("same-repository");
const cursor = (n: number) => AttentionDeliveryCursor.make(`cursor-${n}`);
const checkpoint = (environmentId: EnvironmentId, position = 1) => ({
  environmentId,
  generation: "generation",
  cursor: cursor(position),
  position,
});
function item(
  id = "a",
  kind: ThreadAttentionItem["kind"] = "approval",
  openedAt = "2026-09-28T00:00:00Z",
): ThreadAttentionItem {
  const common = {
    attentionId: AttentionId.make(id.repeat(64)),
    threadId,
    projectId,
    revision: 1,
    sourceEventId: EventId.make("event"),
    sourceSequence: 1,
    openedAt,
    updatedAt: openedAt,
    resolvedAt: null,
    status: "open" as const,
  };
  return kind === "failure" || kind === "disconnect"
    ? {
        ...common,
        kind,
        turnId: TurnId.make("turn"),
        requestId: null,
        title: kind === "failure" ? "Agent failed" : "Provider disconnected",
        reasonCode: kind === "failure" ? "provider_failed" : "provider_disconnected",
      }
    : {
        ...common,
        kind,
        turnId: null,
        requestId: ApprovalRequestId.make(id),
        reasonCode: kind === "approval" ? "approval_requested" : "user_input_requested",
      };
}
const change = (value = item(), version = 1): AttentionChange => ({
  key: `item:${value.attentionId}`,
  version,
  entity: { type: "item", value },
});
const snapshot = (
  items: ReadonlyArray<AttentionChange>,
  status: EnvironmentAttentionState["status"] = "live",
): EnvironmentAttentionState => ({
  status,
  hasSnapshot: true,
  reason: null,
  entries: HashMap.fromIterable(items.map((entry) => [entry.key, entry] as const)),
});
const workspace = (
  ...environments: ReadonlyArray<readonly [EnvironmentId, EnvironmentAttentionState]>
): AttentionWorkspaceState => ({
  isReady: true,
  environments: new Map(environments),
});
const hint = (environmentId = A, updatedAt = "2026-09-28T00:00:00Z") => ({
  environmentId,
  threadId,
  projectTitle: "Repository",
  threadTitle: "Thread",
  modelTitle: "Model",
  phase: "waiting_for_approval",
  status: "Approval needed",
  updatedAt,
  deepLink: "t3code://thread",
});

describe("attention aggregation", () => {
  it("keeps colliding environment-local IDs separate and counts threads separately from items", () => {
    const aggregate = aggregateAttention(
      workspace([A, snapshot([change(), change(item("b"))])], [B, snapshot([change()])]),
    );
    expect(aggregate.complete).toBe(true);
    expect(aggregate.itemCount).toBe(3);
    expect(aggregate.threadCount).toBe(2);
    expect(new Set(aggregate.items.map((row) => row.key)).size).toBe(3);
    expect(aggregate.items.map((row) => row.ref)).toEqual([
      { environmentId: A, threadId },
      { environmentId: A, threadId },
      { environmentId: B, threadId },
    ]);
  });

  it("sorts blocking/errors before warnings, oldest first with deterministic scoped ties", () => {
    const rows = [
      change(item("d", "disconnect", "2026-09-27T00:00:00Z")),
      change(item("c", "failure", "2026-09-28T00:00:01Z")),
      change(item("b", "user_input")),
      change(item("a", "approval")),
    ];
    const project = (entries: ReadonlyArray<AttentionChange>) =>
      aggregateAttention(workspace([B, snapshot(entries)], [A, snapshot(entries)]));
    const first = project(rows);
    expect(
      aggregateAttention(workspace([A, snapshot(rows)]), { priorities: ["warning"] }).items.map(
        (row) => row.item.kind,
      ),
    ).toEqual(["disconnect"]);
    expect(project(rows.toReversed()).items).toEqual(first.items);
    expect(first.items.map((row) => [row.ref.environmentId, row.item.kind])).toEqual([
      [A, "approval"],
      [A, "user_input"],
      [B, "approval"],
      [B, "user_input"],
      [A, "failure"],
      [B, "failure"],
      [A, "disconnect"],
      [B, "disconnect"],
    ]);
  });

  it("reports incomplete totals and scoped filters without trusting saturated summary counts", () => {
    const summary: AttentionChange = {
      key: `summary:${threadId}`,
      version: 2,
      entity: {
        type: "summary",
        value: {
          threadId,
          projectId,
          turnId: null,
          phase: "waiting_for_approval",
          approvalCount: 999,
          inputCount: 999,
          failureCount: 0,
          disconnectCount: 0,
          countsOverflowed: true,
          revision: 1,
          sourceEventId: EventId.make("summary"),
          sourceSequence: 2,
          updatedAt: "2026-09-28T00:00:00Z",
        },
      },
    };
    const state = workspace(
      [A, snapshot([change(), change(item("b", "user_input")), summary])],
      [B, snapshot([change()], "stale")],
    );
    expect(aggregateAttention(state)).toMatchObject({
      complete: false,
      itemCount: 3,
      threadCount: 2,
      liveItemCount: 2,
      liveThreadCount: 1,
      staleItemCount: 1,
      staleThreadCount: 1,
    });
    const filtered = aggregateAttention(state, {
      threads: [{ environmentId: A, threadId }],
      projects: [{ environmentId: A, projectId }],
      kinds: ["user_input"],
    });
    expect(filtered).toMatchObject({ complete: true, itemCount: 1, threadCount: 1 });
    expect(filtered.summaries.size).toBe(1);
    expect(aggregateAttention(state, { environmentIds: [B] }).items[0]?.stale).toBe(true);
    expect(
      aggregateAttention(state, {
        projects: [{ environmentId: A, projectId: ProjectId.make("other") }],
      }).itemCount,
    ).toBe(0);
    expect(aggregateAttention({ ...state, isReady: false }).complete).toBe(false);
  });

  it("never promotes relay hints to items or revives direct resolutions, including stale/empty caches", () => {
    const pending = workspace([A, emptyEnvironmentAttention()]);
    const hints = selectAttentionRelayHints(pending, [
      hint(),
      hint(A, "2026-09-29T00:00:00Z"),
      hint(A, "2026-09-27T00:00:00Z"),
      hint(B),
      { ...hint(), environmentId: undefined },
      { ...hint(), updatedAt: "invalid" },
    ]);
    expect(hints.hints.size).toBe(1);
    expect([...hints.hints.values()][0]?.updatedAt).toBe("2026-09-29T00:00:00Z");
    expect(hints.rejectedCount).toBe(3);
    expect(aggregateAttention(pending).itemCount).toBe(0);
    for (const status of ["live", "stale", "syncing", "error"] as const) {
      const direct = workspace([A, snapshot([], status)], [B, emptyEnvironmentAttention()]);
      expect([...selectAttentionRelayHints(direct, [hint(), hint(B)]).hints.values()]).toEqual([
        hint(B),
      ]);
      expect(aggregateAttention(direct).itemCount).toBe(0);
    }
    expect(
      selectAttentionRelayHints(
        workspace([
          A,
          {
            ...emptyEnvironmentAttention(),
            status: "unauthorized",
          },
        ]),
        [hint()],
      ).hints.size,
    ).toBe(0);
    expect(selectAttentionRelayHints(workspace(), [hint()]).hints.size).toBe(0);
  });
});

type Failure = EnvironmentRpcStreamFailure<typeof WS_METHODS.attentionSubscribe>;
interface Call {
  readonly input: AttentionSubscribeInput;
  readonly messages: Queue.Queue<AttentionStreamMessage, Failure | Cause.Done>;
  readonly closed: Deferred.Deferred<void>;
}

const makeSession = Effect.fn(function* (environmentId: EnvironmentId, supported: boolean = true) {
  const calls = yield* Queue.unbounded<Call>();
  const subscriptions = yield* SubscriptionRef.make(0);
  const config: ServerConfig = {
    environment: {
      environmentId,
      label: environmentId,
      platform: { os: "linux", arch: "x64" },
      serverVersion: "test",
      capabilities: { repositoryIdentity: true, attentionSync: supported },
    },
    auth: {
      policy: "loopback-browser",
      bootstrapMethods: ["one-time-token"],
      sessionMethods: ["browser-session-cookie"],
      sessionCookieName: "t3_session",
    },
    cwd: "/test",
    keybindingsConfigPath: "/test/keybindings.json",
    keybindings: [],
    issues: [],
    providers: [],
    availableEditors: [],
    observability: {
      logsDirectoryPath: "/test/logs",
      localTracingEnabled: false,
      otlpTracesEnabled: false,
      otlpMetricsEnabled: false,
    },
    settings: DEFAULT_SERVER_SETTINGS,
  };
  const subscribe = (input: AttentionSubscribeInput) =>
    Stream.unwrap(
      Effect.gen(function* () {
        const call: Call = {
          input,
          messages: yield* Queue.unbounded<AttentionStreamMessage, Failure | Cause.Done>(),
          closed: yield* Deferred.make<void>(),
        };
        yield* SubscriptionRef.update(subscriptions, (n) => n + 1);
        yield* Queue.offer(calls, call);
        return Stream.fromQueue(call.messages).pipe(
          Stream.ensuring(Deferred.succeed(call.closed, undefined)),
        );
      }),
    );
  // The narrow test transport fails on every other RPC, including shell/thread hydration.
  const client = new Proxy({ [WS_METHODS.attentionSubscribe]: subscribe } as WsRpcProtocolClient, {
    get: (_target, key) => {
      if (key === WS_METHODS.attentionSubscribe) return subscribe;
      throw new Error(`Unexpected RPC: ${String(key)}`);
    },
  });
  const session: RpcSession = {
    client,
    initialConfig: Effect.succeed(config),
    subscribeServerConfig: () => Stream.die("unused"),
    ready: Effect.void,
    probe: Effect.die("unexpected probe"),
    closed: Effect.never,
  };
  return { session, calls, subscriptions };
});

const makeHarness = Effect.fn(function* (ids: ReadonlyArray<EnvironmentId> = [A, B]) {
  const supervisors = new Map<EnvironmentId, EnvironmentSupervisor["Service"]>();
  const sessions = new Map<EnvironmentId, Effect.Success<ReturnType<typeof makeSession>>>();
  const initial = new Map<EnvironmentId, ConnectionCatalogEntry>();
  for (const environmentId of ids) {
    const remote = yield* makeSession(environmentId);
    sessions.set(environmentId, remote);
    const target = new PrimaryConnectionTarget({
      environmentId,
      label: environmentId,
      httpBaseUrl: "https://example.test",
      wsBaseUrl: "wss://example.test",
    });
    initial.set(environmentId, { target, profile: Option.none(), enabled: true });
    supervisors.set(
      environmentId,
      EnvironmentSupervisor.of({
        target,
        session: yield* SubscriptionRef.make(Option.some(remote.session)),
        state: yield* SubscriptionRef.make<SupervisorConnectionState>({
          ...AVAILABLE_CONNECTION_STATE,
          phase: "connected",
          desired: true,
          network: "online",
        }),
        prepared: yield* SubscriptionRef.make(Option.none<PreparedConnection>()),
        connect: Effect.die("unexpected connection"),
        disconnect: Effect.die("unexpected disconnection"),
        retryNow: Effect.die("unexpected socket retry"),
      }),
    );
  }
  const entries =
    yield* SubscriptionRef.make<ReadonlyMap<EnvironmentId, ConnectionCatalogEntry>>(initial);
  const get = (id: EnvironmentId) => Option.fromUndefinedOr(supervisors.get(id));
  const registry = EnvironmentRegistry.of({
    entries,
    networkStatus: yield* SubscriptionRef.make<NetworkStatus>("online"),
    start: Effect.die("unexpected registry start"),
    register: () => Effect.die("unexpected register"),
    registerPlatform: () => Effect.die("unused"),
    reconcilePlatform: () => Effect.die("unused"),
    remove: () => Effect.die("unused"),
    removeRelayEnvironments: () => Effect.die("unused"),
    retryNow: () => Effect.die("unexpected retry"),
    setEnabled: () => Effect.die("unused"),
    state: () => Effect.die("unused"),
    stateChanges: () => Stream.die("unused"),
    followStream: () => Stream.die("unused"),
    run: (id, effect) =>
      Option.match(get(id), {
        onNone: () => Effect.fail(new EnvironmentNotRegisteredError({ environmentId: id })),
        onSome: (supervisor) => Effect.provideService(effect, EnvironmentSupervisor, supervisor),
      }),
    runStream: (id, stream) =>
      Option.match(get(id), {
        onNone: () => Stream.fail(new EnvironmentNotRegisteredError({ environmentId: id })),
        onSome: (supervisor) => Stream.provideService(stream, EnvironmentSupervisor, supervisor),
      }),
  });
  const state = yield* makeAttentionWorkspaceState().pipe(
    Effect.provideService(EnvironmentRegistry, registry),
  );
  const supervisor = (id: EnvironmentId) => Option.getOrThrow(get(id));
  const remote = (id: EnvironmentId) => Option.getOrThrow(Option.fromUndefinedOr(sessions.get(id)));
  const awaitState = (predicate: (value: AttentionWorkspaceState) => boolean) =>
    SubscriptionRef.changes(state).pipe(
      Stream.filter(predicate),
      Stream.runHead,
      Effect.map(Option.getOrThrow),
    );
  const awaitStatus = (id: EnvironmentId, status: EnvironmentAttentionState["status"]) =>
    awaitState((value) => value.environments.get(id)?.status === status);
  return { state, entries, initial, supervisor, remote, awaitState, awaitStatus };
});
const bootstrap = (call: Call, environmentId: EnvironmentId, entries = [change()], position = 1) =>
  Queue.offerAll(call.messages, [
    { ...checkpoint(environmentId, position), type: "begin", mode: "snapshot" },
    {
      ...checkpoint(environmentId, position),
      type: "page",
      entries,
      pageToken: AttentionPageToken.make("page"),
      previousPageToken: null,
    },
    { ...checkpoint(environmentId, position), type: "sync-complete" },
  ]);
const delta = (
  environmentId: EnvironmentId,
  position: number,
  changes: ReadonlyArray<AttentionChange>,
): Extract<AttentionStreamMessage, { type: "delta" }> => ({
  ...checkpoint(environmentId, position),
  type: "delta",
  after: cursor(position - 1),
  changes,
  notificationEligible: true,
});

describe("registry-owned attention subscriptions", () => {
  it.effect(
    "ignores a replaced session's delayed configuration and clears just the removed environment",
    () =>
      Effect.gen(function* () {
        const h = yield* makeHarness();
        const a = yield* Queue.take(h.remote(A).calls);
        const b = yield* Queue.take(h.remote(B).calls);
        yield* bootstrap(a, A);
        yield* bootstrap(b, B);
        const before = yield* h.awaitState((s) => aggregateAttention(s).complete);
        const healthy = before.environments.get(B);
        const delayed = yield* makeSession(A);
        const waiting = yield* Deferred.make<void>();
        const release = yield* Deferred.make<void>();
        yield* SubscriptionRef.set(
          h.supervisor(A).session,
          Option.some({
            ...delayed.session,
            initialConfig: Deferred.succeed(waiting, undefined).pipe(
              Effect.andThen(Deferred.await(release)),
              Effect.andThen(delayed.session.initialConfig),
            ),
          }),
        );
        yield* Deferred.await(waiting);
        const replacement = yield* makeSession(A);
        yield* SubscriptionRef.set(h.supervisor(A).session, Option.some(replacement.session));
        const current = yield* Queue.take(replacement.calls);
        yield* Deferred.succeed(release, undefined);
        yield* bootstrap(current, A, []);
        yield* h.awaitStatus(A, "live");
        expect(yield* SubscriptionRef.get(delayed.subscriptions)).toBe(0);
        yield* SubscriptionRef.set(h.entries, new Map([...h.initial].filter(([id]) => id === B)));
        const removed = yield* h.awaitState((s) => !s.environments.has(A));
        yield* Deferred.await(current.closed);
        expect(removed.environments.get(B)).toBe(healthy);
        expect(aggregateAttention(removed)).toMatchObject({ complete: true, itemCount: 1 });
        expect(yield* SubscriptionRef.get(h.remote(B).subscriptions)).toBe(1);
      }),
  );

  it.effect("retries recoverable unavailability but stops oversized or defective streams", () =>
    Effect.gen(function* () {
      const h = yield* makeHarness([A]);
      const initial = yield* Queue.take(h.remote(A).calls);
      yield* Queue.fail(
        initial.messages,
        new AttentionSyncError({ reason: "unavailable", message: "Rebuilding" }),
      );
      yield* h.awaitState((s) => s.environments.get(A)?.reason === "attention-unavailable");
      yield* TestClock.adjust("3 seconds");
      const retry = yield* Queue.take(h.remote(A).calls);
      yield* Queue.offer(retry.messages, { type: "reset-required", reason: "message-too-large" });
      yield* h.awaitStatus(A, "error");
      yield* TestClock.adjust("1 hour");
      expect(yield* SubscriptionRef.get(h.remote(A).subscriptions)).toBe(2);
      const replacement = yield* makeSession(A);
      yield* SubscriptionRef.set(h.supervisor(A).session, Option.some(replacement.session));
      const next = yield* Queue.take(replacement.calls);
      yield* Queue.failCause(next.messages, Cause.die(new Error("Malformed protocol")));
      yield* h.awaitStatus(A, "error");
      yield* TestClock.adjust("1 hour");
      expect(yield* SubscriptionRef.get(replacement.subscriptions)).toBe(1);
    }),
  );

  it.effect(
    "publishes only complete per-environment fences, retaining healthy data during partial bootstrap",
    () =>
      Effect.gen(function* () {
        const h = yield* makeHarness();
        const a = yield* Queue.take(h.remote(A).calls);
        const b = yield* Queue.take(h.remote(B).calls);
        yield* bootstrap(a, A, [change(), change(item("b"))]);
        const partial = yield* h.awaitStatus(A, "live");
        expect(aggregateAttention(partial)).toMatchObject({
          complete: false,
          itemCount: 2,
          threadCount: 1,
        });
        yield* Queue.offerAll(b.messages, [
          { ...checkpoint(B), type: "begin", mode: "snapshot" },
          {
            ...checkpoint(B),
            type: "page",
            entries: [change()],
            pageToken: AttentionPageToken.make("page"),
            previousPageToken: null,
          },
        ]);
        yield* Queue.offer(a.messages, delta(A, 2, [change(item("c"), 2)]));
        const stillPartial = yield* h.awaitState((s) => aggregateAttention(s).itemCount === 3);
        expect(stillPartial.environments.get(B)?.hasSnapshot).toBe(false);
        expect(aggregateAttention(stillPartial).complete).toBe(false);
        yield* Queue.offer(b.messages, { ...checkpoint(B), type: "sync-complete" });
        const live = yield* h.awaitStatus(B, "live");
        expect(aggregateAttention(live)).toMatchObject({
          complete: true,
          itemCount: 4,
          threadCount: 2,
        });
        expect(yield* SubscriptionRef.get(h.remote(A).subscriptions)).toBe(1);
        expect(yield* SubscriptionRef.get(h.remote(B).subscriptions)).toBe(1);
      }),
  );

  it.effect(
    "retains stale rows through reconnect and atomically replaces only that environment",
    () =>
      Effect.gen(function* () {
        const h = yield* makeHarness();
        const a = yield* Queue.take(h.remote(A).calls);
        const b = yield* Queue.take(h.remote(B).calls);
        yield* bootstrap(a, A);
        yield* bootstrap(b, B);
        const before = yield* h.awaitState((s) => aggregateAttention(s).complete);
        const healthy = before.environments.get(B);
        yield* SubscriptionRef.set(h.supervisor(A).session, Option.none());
        const stale = yield* h.awaitStatus(A, "stale");
        expect(aggregateAttention(stale)).toMatchObject({
          itemCount: 2,
          staleItemCount: 1,
          liveItemCount: 1,
          complete: false,
        });
        yield* Deferred.await(a.closed);
        const replacement = yield* makeSession(A);
        yield* SubscriptionRef.set(h.supervisor(A).session, Option.some(replacement.session));
        const resumed = yield* Queue.take(replacement.calls);
        expect(resumed.input.cursor).toBeUndefined();
        const syncing = yield* h.awaitStatus(A, "syncing");
        expect(aggregateAttention(syncing).staleItemCount).toBe(1);
        yield* Queue.offer(a.messages, delta(A, 2, [change(item("f"), 2)]));
        yield* bootstrap(resumed, A, [change(item("b")), change(item("c"))], 2);
        const refreshed = yield* h.awaitStatus(A, "live");
        expect(refreshed.environments.get(B)).toBe(healthy);
        expect(aggregateAttention(refreshed)).toMatchObject({
          complete: true,
          itemCount: 3,
          threadCount: 2,
        });
        expect(
          aggregateAttention(refreshed)
            .items.filter((row) => row.ref.environmentId === A)
            .map((row) => row.item.attentionId),
        ).toEqual([item("b").attentionId, item("c").attentionId]);
      }),
  );

  it.effect("does not reuse an interrupted bootstrap cursor or expose its partial items", () =>
    Effect.gen(function* () {
      const h = yield* makeHarness([A]);
      const call = yield* Queue.take(h.remote(A).calls);
      yield* Queue.offerAll(call.messages, [
        { ...checkpoint(A), type: "begin", mode: "snapshot" },
        {
          ...checkpoint(A),
          type: "page",
          entries: [change()],
          pageToken: AttentionPageToken.make("page"),
          previousPageToken: null,
        },
      ]);
      yield* Queue.end(call.messages);
      yield* h.awaitState((s) => s.environments.get(A)?.reason === "stream-ended");
      expect(aggregateAttention(yield* SubscriptionRef.get(h.state)).itemCount).toBe(0);
      yield* TestClock.adjust("3 seconds");
      const retry = yield* Queue.take(h.remote(A).calls);
      expect(retry.input.cursor).toBeUndefined();
      yield* bootstrap(retry, A, []);
      expect(aggregateAttention(yield* h.awaitStatus(A, "live")).itemCount).toBe(0);
    }),
  );

  it.effect(
    "uses the capped backoff for resets without reconnecting, resuming only a complete same-session cache",
    () =>
      Effect.gen(function* () {
        const h = yield* makeHarness([A]);
        let call = yield* Queue.take(h.remote(A).calls);
        yield* bootstrap(call, A);
        yield* h.awaitStatus(A, "live");
        yield* Queue.end(call.messages);
        yield* h.awaitStatus(A, "stale");
        yield* TestClock.adjust("2999 millis");
        expect(yield* SubscriptionRef.get(h.remote(A).subscriptions)).toBe(1);
        yield* TestClock.adjust("1 milli");
        call = yield* Queue.take(h.remote(A).calls);
        expect(call.input.cursor).toBe(cursor(1));
        yield* Queue.offerAll(call.messages, [
          { ...checkpoint(A), type: "begin", mode: "resume" },
          delta(A, 2, [{ key: change().key, version: 2, entity: null }]),
          { ...checkpoint(A, 2), type: "sync-complete" },
        ]);
        expect(aggregateAttention(yield* h.awaitStatus(A, "live")).itemCount).toBe(0);
        for (const delay of [4_000, 8_000, 16_000, 16_000]) {
          yield* Queue.offer(call.messages, { type: "reset-required", reason: "rebuilding" });
          yield* Deferred.await(call.closed);
          const count = yield* SubscriptionRef.get(h.remote(A).subscriptions);
          yield* TestClock.adjust(delay - 1);
          expect(yield* SubscriptionRef.get(h.remote(A).subscriptions)).toBe(count);
          yield* TestClock.adjust(1);
          call = yield* Queue.take(h.remote(A).calls);
          expect(call.input.cursor).toBeUndefined();
        }
      }),
  );

  it.effect(
    "evicts revoked or blocked authority, stops retries, and preserves the other environment",
    () =>
      Effect.gen(function* () {
        const h = yield* makeHarness();
        const a = yield* Queue.take(h.remote(A).calls);
        const b = yield* Queue.take(h.remote(B).calls);
        yield* bootstrap(a, A);
        yield* bootstrap(b, B);
        yield* h.awaitState((s) => aggregateAttention(s).complete);
        yield* Queue.fail(
          a.messages,
          new EnvironmentAuthorizationError({
            message: "Revoked",
            requiredScope: "orchestration:read",
          }),
        );
        const unauthorized = yield* h.awaitStatus(A, "unauthorized");
        expect(aggregateAttention(unauthorized)).toMatchObject({ itemCount: 1, complete: false });
        expect(unauthorized.environments.get(A)?.hasSnapshot).toBe(false);
        yield* TestClock.adjust("1 hour");
        expect(yield* SubscriptionRef.get(h.remote(A).subscriptions)).toBe(1);
        yield* SubscriptionRef.set(h.supervisor(B).state, {
          ...AVAILABLE_CONNECTION_STATE,
          phase: "blocked",
          desired: true,
          lastFailure: new ConnectionBlockedError({ reason: "permission", detail: "Revoked" }),
        });
        const blocked = yield* h.awaitStatus(B, "unauthorized");
        yield* Deferred.await(b.closed);
        expect(aggregateAttention(blocked).itemCount).toBe(0);
        yield* SubscriptionRef.set(h.supervisor(A).session, Option.none());
        yield* TestClock.adjust("1 hour");
        expect((yield* SubscriptionRef.get(h.state)).environments.get(A)?.status).toBe(
          "unauthorized",
        );
      }),
  );

  it.effect(
    "removes disabled/removed caches and cancels subscriptions before re-enable or target replacement",
    () =>
      Effect.gen(function* () {
        const h = yield* makeHarness();
        const a = yield* Queue.take(h.remote(A).calls);
        const b = yield* Queue.take(h.remote(B).calls);
        yield* bootstrap(a, A);
        yield* bootstrap(b, B);
        yield* h.awaitState((s) => aggregateAttention(s).complete);
        const entryA = Option.getOrThrow(Option.fromUndefinedOr(h.initial.get(A)));
        yield* SubscriptionRef.set(h.entries, new Map([[A, { ...entryA, enabled: false }]]));
        yield* h.awaitState((s) => s.environments.size === 0);
        yield* Deferred.await(a.closed);
        yield* Deferred.await(b.closed);
        yield* SubscriptionRef.set(h.entries, new Map([[A, entryA]]));
        const enabled = yield* Queue.take(h.remote(A).calls);
        expect(enabled.input.cursor).toBeUndefined();
        expect(aggregateAttention(yield* SubscriptionRef.get(h.state)).itemCount).toBe(0);
        yield* bootstrap(enabled, A);
        yield* h.awaitStatus(A, "live");
        yield* SubscriptionRef.set(
          h.entries,
          new Map([
            [
              A,
              {
                ...entryA,
                target: new PrimaryConnectionTarget({
                  environmentId: A,
                  label: "Changed target",
                  httpBaseUrl: "https://changed.test",
                  wsBaseUrl: "wss://changed.test",
                }),
              },
            ],
          ]),
        );
        const replacement = yield* Queue.take(h.remote(A).calls);
        yield* Deferred.await(enabled.closed);
        expect(replacement.input.cursor).toBeUndefined();
        yield* bootstrap(replacement, A, []);
        expect(aggregateAttention(yield* h.awaitStatus(A, "live")).itemCount).toBe(0);
      }),
  );

  it.effect(
    "waits for the supervisor after transport loss and exposes unsupported capability without subscribing",
    () =>
      Effect.gen(function* () {
        const h = yield* makeHarness([A]);
        const call = yield* Queue.take(h.remote(A).calls);
        yield* bootstrap(call, A);
        yield* h.awaitStatus(A, "live");
        yield* Queue.fail(
          call.messages,
          new RpcClientError.RpcClientError({
            reason: new RpcClientError.RpcClientDefect({ message: "Disconnected", cause: null }),
          }),
        );
        yield* h.awaitStatus(A, "stale");
        yield* TestClock.adjust("1 hour");
        expect(yield* SubscriptionRef.get(h.remote(A).subscriptions)).toBe(1);
        const unsupported = yield* makeSession(A, false);
        yield* SubscriptionRef.set(h.supervisor(A).session, Option.some(unsupported.session));
        const state = yield* h.awaitStatus(A, "unsupported");
        expect(aggregateAttention(state)).toMatchObject({ itemCount: 0, complete: false });
        expect(yield* SubscriptionRef.get(unsupported.subscriptions)).toBe(0);
      }),
  );

  it.effect("rejects mismatched frames and protocol faults without resubscription loops", () =>
    Effect.gen(function* () {
      const h = yield* makeHarness([A]);
      const call = yield* Queue.take(h.remote(A).calls);
      yield* bootstrap(call, B);
      yield* h.awaitStatus(A, "error");
      yield* TestClock.adjust("1 hour");
      expect(yield* SubscriptionRef.get(h.remote(A).subscriptions)).toBe(1);
      const replacement = yield* makeSession(A);
      yield* SubscriptionRef.set(h.supervisor(A).session, Option.some(replacement.session));
      const next = yield* Queue.take(replacement.calls);
      yield* bootstrap(next, A);
      yield* h.awaitStatus(A, "live");
      yield* Queue.fail(
        next.messages,
        new AttentionSyncError({ reason: "cursor-scope-mismatch", message: "Wrong cursor" }),
      );
      const failed = yield* h.awaitStatus(A, "error");
      expect(aggregateAttention(failed)).toMatchObject({ complete: false, staleItemCount: 1 });
      yield* TestClock.adjust("1 hour");
      expect(yield* SubscriptionRef.get(replacement.subscriptions)).toBe(1);
    }),
  );

  it.effect(
    "cannot resurrect resolved items with duplicate/lower transport revisions or relay disagreement",
    () =>
      Effect.gen(function* () {
        const h = yield* makeHarness([A]);
        const call = yield* Queue.take(h.remote(A).calls);
        yield* bootstrap(call, A);
        yield* h.awaitStatus(A, "live");
        const removed = delta(A, 2, [{ key: change().key, version: 2, entity: null }]);
        yield* Queue.offer(call.messages, removed);
        const resolved = yield* h.awaitState(
          (s) => aggregateAttention(s).complete && aggregateAttention(s).itemCount === 0,
        );
        expect(
          selectAttentionRelayHints(resolved, [hint(A, "2099-01-01T00:00:00Z")]).hints.size,
        ).toBe(0);
        yield* Queue.offer(call.messages, { ...removed, changes: [change()] });
        yield* Queue.offer(call.messages, delta(A, 3, [change()]));
        const rejected = yield* h.awaitStatus(A, "error");
        expect(aggregateAttention(rejected).itemCount).toBe(0);
      }),
  );
});
