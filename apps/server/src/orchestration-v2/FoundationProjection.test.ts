import { assert, it } from "@effect/vitest";
import {
  EnvironmentId,
  EventId,
  NodeId,
  ProjectId,
  ProviderDriverKind,
  ProviderInstanceId,
  ProviderSessionId,
  ProviderThreadId,
  ProviderTurnId,
  RawEventId,
  RuntimeRequestId,
  ThreadId,
  type OrchestrationV2AppThread,
  type OrchestrationV2DomainEvent,
  type OrchestrationV2ExecutionNode,
  type OrchestrationV2RuntimeRequest,
  type OrchestrationV2ProviderThread,
  type AttentionStreamMessage,
  type AttentionId,
} from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";
import * as SqlClient from "effect/sql/SqlClient";
import * as Sqlite from "../persistence/Sqlite.ts";
import * as ApplicationEvents from "../persistence/OrchestrationEventStore.ts";
import { ProjectionThreadAttentionCurrentRepository as Current } from "../persistence/Services/ProjectionThreadAttentionCurrent.ts";
import { ProjectionThreadAttentionCurrentRepositoryLive } from "../persistence/Layers/ProjectionThreadAttentionCurrent.ts";
import { ProjectionThreadAttentionAuditRepository as Audit } from "../persistence/Services/ProjectionThreadAttentionAudit.ts";
import { ProjectionThreadAttentionAuditRepositoryLive } from "../persistence/Layers/ProjectionThreadAttentionAudit.ts";
import * as EventStore from "./EventStore.ts";
import * as ProjectionStore from "./ProjectionStore.ts";
import * as EventSink from "./EventSink.ts";
import * as Foundation from "./FoundationProjection.ts";
import { makeAttentionStream } from "./AttentionSync.ts";
import { CodexProviderCapabilitiesV2 } from "./Adapters/CodexAdapterV2.ts";

const stores = Layer.mergeAll(
  EventStore.layer,
  ProjectionStore.layer,
  ApplicationEvents.layer,
).pipe(Layer.provideMerge(Sqlite.layerMemory));
const layer = Layer.mergeAll(
  EventSink.layer,
  Foundation.layer,
  ProjectionThreadAttentionCurrentRepositoryLive,
  ProjectionThreadAttentionAuditRepositoryLive,
).pipe(Layer.provideMerge(stores));
const threadId = ThreadId.make("attention-v2");
const projectId = ProjectId.make("project");
const instanceId = ProviderInstanceId.make("codex");
const providerThreadId = ProviderThreadId.make("native-thread");
const providerTurnId = ProviderTurnId.make("native-turn");
const nodeId = NodeId.make("root");
const time = DateTime.makeUnsafe("2026-10-28T00:00:00Z");
const thread: OrchestrationV2AppThread = {
  id: threadId,
  projectId,
  title: "Attention V2",
  createdBy: "user",
  creationSource: "web",
  providerInstanceId: instanceId,
  modelSelection: { instanceId, model: "test" },
  runtimeMode: "full-access",
  interactionMode: "default",
  branch: null,
  worktreePath: null,
  activeProviderThreadId: null,
  lineage: { parentThreadId: null, relationshipToParent: null, rootThreadId: threadId },
  forkedFrom: null,
  createdAt: time,
  updatedAt: time,
  archivedAt: null,
  settledOverride: null,
  settledAt: null,
  lastVisitedAt: null,
  deletedAt: null,
};
const root: OrchestrationV2ExecutionNode = {
  id: nodeId,
  threadId,
  runId: null,
  parentNodeId: null,
  rootNodeId: nodeId,
  kind: "root_turn",
  status: "running",
  countsForRun: true,
  providerThreadId,
  providerTurnId,
  nativeItemRef: null,
  runtimeRequestId: null,
  checkpointScopeId: null,
  startedAt: time,
  completedAt: null,
};
const providerThread: OrchestrationV2ProviderThread = {
  id: providerThreadId,
  driver: ProviderDriverKind.make("codex"),
  providerInstanceId: instanceId,
  providerSessionId: ProviderSessionId.make("session"),
  appThreadId: threadId,
  ownerNodeId: nodeId,
  nativeThreadRef: null,
  nativeConversationHeadRef: null,
  status: "active",
  firstRunOrdinal: null,
  lastRunOrdinal: null,
  handoffIds: [],
  forkedFrom: null,
  createdAt: time,
  updatedAt: time,
};
const request: OrchestrationV2RuntimeRequest = {
  id: RuntimeRequestId.make("request"),
  nodeId,
  providerTurnId,
  nativeRequestRef: null,
  kind: "command",
  status: "pending",
  responseCapability: { type: "live", providerSessionId: ProviderSessionId.make("session") },
  createdAt: time,
  resolvedAt: null,
};
const harness = Effect.fn("foundationHarness")(function* () {
  const sink = yield* EventSink.EventSinkV2;
  const current = yield* Current;
  const audit = yield* Audit;
  const foundation = yield* Foundation.FoundationProjection;
  let sequence = 0;
  const write = (
    event: Omit<
      Extract<OrchestrationV2DomainEvent, { type: "runtime-request.updated" }>,
      "id" | "threadId" | "occurredAt"
    >,
  ) =>
    sink.write({
      events: [
        { ...event, id: EventId.make(`request-event-${++sequence}`), threadId, occurredAt: time },
      ],
    });
  const lifecycle = (status: "running" | "completed" | "failed" | "interrupted") =>
    sink.write({
      events: [
        {
          id: EventId.make(`turn-event-${++sequence}`),
          type: "provider-turn.updated",
          threadId,
          occurredAt: time,
          payload: {
            id: providerTurnId,
            providerThreadId,
            nodeId,
            runAttemptId: null,
            nativeTurnRef: null,
            ordinal: 1,
            status,
            startedAt: time,
            completedAt: status === "running" ? null : time,
          },
        },
      ],
    });
  yield* sink.write({
    events: [
      {
        id: EventId.make("created"),
        type: "thread.created",
        threadId,
        occurredAt: time,
        payload: thread,
      },
      {
        id: EventId.make("provider"),
        type: "provider-thread.updated",
        threadId,
        occurredAt: time,
        payload: providerThread,
      },
      { id: EventId.make("node"), type: "node.updated", threadId, occurredAt: time, payload: root },
    ],
  });
  return {
    sink,
    current,
    audit,
    foundation,
    write,
    lifecycle,
    items: () => current.listByThreadId({ threadId, limit: 100 }),
    summary: current.getSummary(threadId).pipe(Effect.map(Option.getOrThrow)),
  };
});

it.effect(
  "projects native requests, intent, delivery failure, and confirmation without rewriting audit",
  () =>
    Effect.gen(function* () {
      const h = yield* harness();
      yield* h.lifecycle("running");
      yield* h.write({ type: "runtime-request.updated", payload: request });
      const opened = (yield* h.items())[0]!;
      yield* h.write({ type: "runtime-request.updated", payload: request });
      assert.deepEqual((yield* h.items())[0], opened);
      yield* h.write({
        type: "runtime-request.updated",
        payload: { ...request, status: "resolved", resolvedAt: time, responseDelivery: "pending" },
      });
      assert.equal((yield* h.items())[0]?.status, "open");
      yield* h.write({
        type: "runtime-request.updated",
        payload: { ...request, status: "resolved", resolvedAt: time, responseDelivery: "failed" },
      });
      assert.equal((yield* h.items())[0]?.reasonCode, "response_failed");
      yield* h.write({
        type: "runtime-request.updated",
        payload: {
          ...request,
          status: "resolved",
          resolvedAt: time,
          responseDelivery: "confirmed",
        },
      });
      const resolved = (yield* h.items())[0];
      assert.equal(resolved?.status, "resolved");
      yield* h.write({
        type: "runtime-request.updated",
        payload: { ...request, status: "resolved", resolvedAt: time, responseDelivery: "failed" },
      });
      assert.deepEqual((yield* h.items())[0], resolved);
      const audit = yield* h.audit.listByThreadId({ threadId, limit: 100 });
      const items = yield* h.items();
      yield* h.foundation.rebuild;
      assert.deepEqual(yield* h.items(), items);
      assert.deepEqual(yield* h.audit.listByThreadId({ threadId, limit: 100 }), audit);
    }).pipe(Effect.provide(layer)),
);

it.effect(
  "uses canonical turn ownership, keeps message questions after completion, and purges recreation",
  () =>
    Effect.gen(function* () {
      const h = yield* harness();
      yield* h.lifecycle("running");
      yield* h.write({ type: "runtime-request.updated", payload: request });
      yield* h.write({
        type: "runtime-request.updated",
        payload: {
          ...request,
          id: RuntimeRequestId.make("message-question"),
          kind: "user_input",
          responseCapability: { type: "message" },
        },
      });
      assert.equal((yield* h.summary).phase, "waiting_for_approval");
      yield* h.lifecycle("failed");
      assert.equal((yield* h.summary).failureCount, 1);
      assert.equal((yield* h.summary).inputCount, 1);
      yield* h.lifecycle("running");
      assert.equal((yield* h.summary).failureCount, 0);
      yield* h.lifecycle("completed");
      assert.equal((yield* h.summary).inputCount, 1);
      const identity = (yield* h.items()).find((item) => item.kind === "user_input")!.attentionId;
      yield* h.sink.write({
        events: [
          {
            id: EventId.make("delete"),
            type: "thread.deleted",
            threadId,
            occurredAt: time,
            payload: { ...thread, deletedAt: time },
          },
        ],
      });
      assert.deepEqual(yield* h.items(), []);
      yield* h.sink.write({
        events: [
          {
            id: EventId.make("recreate"),
            type: "thread.created",
            threadId,
            occurredAt: time,
            payload: thread,
          },
        ],
      });
      yield* h.write({
        type: "runtime-request.updated",
        payload: {
          ...request,
          id: RuntimeRequestId.make("message-question"),
          kind: "user_input",
          responseCapability: { type: "message" },
        },
      });
      assert.notEqual((yield* h.items())[0]?.attentionId, identity);
    }).pipe(Effect.provide(layer)),
);

it.effect("rolls back canonical events, attention, and delivery together and retries", () =>
  Effect.gen(function* () {
    const h = yield* harness();
    const sql = yield* SqlClient.SqlClient;
    const before = yield* sql`SELECT * FROM foundation_projection_cursor`;
    yield* sql`CREATE TRIGGER reject_attention BEFORE INSERT ON projection_thread_attention_current BEGIN SELECT RAISE(ABORT, 'fixture'); END`;
    yield* Effect.flip(h.write({ type: "runtime-request.updated", payload: request }));
    assert.deepEqual(yield* h.items(), []);
    assert.deepEqual(yield* sql`SELECT * FROM foundation_projection_cursor`, before);
    assert.deepEqual(
      yield* sql`SELECT event_id FROM orchestration_events WHERE event_type = 'runtime-request.updated'`,
      [],
    );
    yield* sql`DROP TRIGGER reject_attention`;
    yield* h.write({ type: "runtime-request.updated", payload: request });
    assert.equal((yield* h.items())[0]?.status, "open");
  }).pipe(Effect.provide(layer)),
);

it.effect(
  "attributes disconnects to the active native session and ignores replayed loss after recovery",
  () =>
    Effect.gen(function* () {
      const h = yield* harness();
      yield* h.lifecycle("running");
      const lost: Extract<
        OrchestrationV2DomainEvent,
        { type: "provider-session.updated" | "provider-session.attached" }
      > = {
        id: EventId.make("lost"),
        type: "provider-session.updated",
        threadId,
        occurredAt: time,
        rawEventId: RawEventId.make("loss-observation"),
        payload: {
          id: ProviderSessionId.make("session"),
          driver: ProviderDriverKind.make("codex"),
          providerInstanceId: instanceId,
          status: "error",
          cwd: "/workspace",
          model: null,
          capabilities: CodexProviderCapabilitiesV2,
          createdAt: time,
          updatedAt: time,
          lastError: null,
        },
      };
      yield* h.sink.write({
        events: [
          {
            ...lost,
            id: EventId.make("unrelated-session"),
            payload: { ...lost.payload, id: ProviderSessionId.make("other-session") },
          },
        ],
      });
      assert.equal((yield* h.summary).disconnectCount, 0);
      yield* h.sink.write({ events: [lost] });
      assert.equal((yield* h.summary).phase, "stale");
      assert.equal((yield* h.summary).disconnectCount, 1);
      yield* h.sink.write({
        events: [
          { ...lost, id: EventId.make("ready"), payload: { ...lost.payload, status: "ready" } },
        ],
      });
      assert.equal((yield* h.summary).disconnectCount, 1);
      yield* h.lifecycle("running");
      assert.equal((yield* h.summary).disconnectCount, 0);
      yield* h.sink.write({ events: [{ ...lost, id: EventId.make("delayed-duplicate") }] });
      assert.equal((yield* h.summary).disconnectCount, 0);
      yield* h.lifecycle("interrupted");
      yield* h.sink.write({
        events: [
          { ...lost, id: EventId.make("post-stop"), rawEventId: RawEventId.make("different-loss") },
        ],
      });
      assert.equal((yield* h.summary).disconnectCount, 0);
    }).pipe(Effect.provide(layer)),
);

it.effect("saturates compact counts without truncating keyset-paged current details", () =>
  Effect.gen(function* () {
    const h = yield* harness();
    yield* h.sink.write({
      events: Array.from({ length: 1_001 }, (_, index) => ({
        id: EventId.make(`bounded-source-${index}`),
        type: "runtime-request.updated" as const,
        threadId,
        occurredAt: time,
        payload: { ...request, id: RuntimeRequestId.make(`bounded-request-${index}`) },
      })),
    });
    assert.equal((yield* h.summary).approvalCount, 999);
    assert.isTrue((yield* h.summary).countsOverflowed);
    let afterAttentionId: AttentionId | undefined;
    let count = 0;
    while (true) {
      const page = yield* h.current.listByThreadId({
        threadId,
        limit: 100,
        ...(afterAttentionId === undefined ? {} : { afterAttentionId }),
      });
      count += page.length;
      if (page.length < 100) break;
      afterAttentionId = page.at(-1)!.attentionId;
    }
    assert.equal(count, 1_001);
  }).pipe(Effect.provide(layer)),
);

it.effect("streams bounded bootstrap then a post-commit delta using the existing event owner", () =>
  Effect.gen(function* () {
    const h = yield* harness();
    const received = yield* Queue.unbounded<AttentionStreamMessage>();
    yield* makeAttentionStream(
      {},
      {
        environmentId: EnvironmentId.make("environment"),
        scopeBinding: "authorized-session",
        secret: new Uint8Array(32),
        authorize: Effect.void,
        authorizationChanges: Stream.never,
      },
    ).pipe(
      Stream.runForEach((message) => Queue.offer(received, message)),
      Effect.forkScoped(),
    );
    assert.equal((yield* Queue.take(received)).type, "begin");
    let message = yield* Queue.take(received);
    while (message.type !== "sync-complete") message = yield* Queue.take(received);
    yield* h.write({ type: "runtime-request.updated", payload: request });
    const delta = yield* Queue.take(received);
    assert.equal(delta.type, "delta");
    if (delta.type === "delta") {
      assert.isTrue(delta.notificationEligible);
      assert.isTrue(
        delta.changes.some(
          (change) => change.entity?.type === "item" && change.entity.value.status === "open",
        ),
      );
    }
  }).pipe(Effect.scoped, Effect.provide(layer)),
);
