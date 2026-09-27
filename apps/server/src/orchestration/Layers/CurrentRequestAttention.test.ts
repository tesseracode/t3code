import {
  ApprovalRequestId,
  CommandId,
  EventId,
  type OrchestrationEvent,
  ProjectId,
  ProviderInstanceId,
  ThreadId,
  TurnId,
} from "@t3tools/contracts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import { OrchestrationEventStoreLive } from "../../persistence/Layers/OrchestrationEventStore.ts";
import {
  makeSqlitePersistenceLive,
  SqlitePersistenceMemory,
} from "../../persistence/Layers/Sqlite.ts";
import { OrchestrationEventStore } from "../../persistence/Services/OrchestrationEventStore.ts";
import { ProjectionStateRepository } from "../../persistence/Services/ProjectionState.ts";
import {
  CURRENT_ATTENTION_PROJECTOR,
  ProjectionThreadAttentionCurrentRepository,
} from "../../persistence/Services/ProjectionThreadAttentionCurrent.ts";
import { OrchestrationProjectionPipeline } from "../Services/ProjectionPipeline.ts";
import { OrchestrationProjectionPipelineLive } from "./ProjectionPipeline.ts";
import { ServerConfig } from "../../config.ts";

const makeLayer = (dbPath?: string) =>
  OrchestrationProjectionPipelineLive.pipe(
    Layer.provideMerge(OrchestrationEventStoreLive),
    Layer.provideMerge(ServerConfig.layerTest(process.cwd(), { prefix: "t3-current-attention-" })),
    Layer.provideMerge(dbPath ? makeSqlitePersistenceLive(dbPath) : SqlitePersistenceMemory),
    Layer.provideMerge(NodeServices.layer),
  );
const fixture = Effect.gen(function* () {
  const store = yield* OrchestrationEventStore;
  const pipeline = yield* OrchestrationProjectionPipeline;
  const attention = yield* ProjectionThreadAttentionCurrentRepository;
  const projectionState = yield* ProjectionStateRepository;
  const sql = yield* SqlClient.SqlClient;
  let nextId = 0;
  const base = (threadId: ThreadId) => ({
    eventId: EventId.make(`attention-event-${++nextId}`),
    aggregateKind: "thread" as const,
    aggregateId: threadId,
    occurredAt: "2026-09-27T00:00:00.000Z",
    commandId: CommandId.make(`attention-command-${nextId}`),
    causationEventId: null,
    correlationId: null,
    metadata: {},
  });
  const append = Effect.fn("test.appendCurrentAttention")(function* (
    event: Omit<OrchestrationEvent, "sequence">,
    project = true,
  ) {
    const stored = yield* store.append(event);
    if (project) yield* pipeline.projectEvent(stored);
    return stored;
  });
  const thread = Effect.fn("test.createAttentionThread")(function* (
    threadId = ThreadId.make("thread"),
    projectId = ProjectId.make("project"),
  ) {
    return yield* append({
      ...base(threadId),
      type: "thread.created",
      payload: {
        threadId,
        projectId,
        title: "Thread",
        modelSelection: {
          instanceId: ProviderInstanceId.make("githubCopilot"),
          model: "gpt-5-mini",
        },
        runtimeMode: "approval-required",
        interactionMode: "default",
        branch: null,
        worktreePath: null,
        createdAt: "2026-09-27T00:00:00.000Z",
        updatedAt: "2026-09-27T00:00:00.000Z",
      },
    });
  });
  const activity = Effect.fn("test.attentionActivity")(function* (
    kind: string,
    requestId = "request",
    options: {
      threadId?: ThreadId;
      turnId?: TurnId | null;
      historyImport?: boolean;
      project?: boolean;
    } = {},
  ) {
    const threadId = options.threadId ?? ThreadId.make("thread");
    const event = base(threadId);
    return yield* append(
      {
        ...event,
        type: "thread.activity-appended",
        metadata: options.historyImport ? { historyImport: true } : {},
        payload: {
          threadId,
          activity: {
            id: event.eventId,
            kind,
            tone: "info",
            summary: "private original summary",
            payload: {
              requestId,
              detail: "private command/error",
              questions: ["private question"],
            },
            turnId: options.turnId === undefined ? TurnId.make("turn") : options.turnId,
            createdAt: event.occurredAt,
          },
        },
      },
      options.project ?? true,
    );
  });
  const list = (threadId = ThreadId.make("thread")) =>
    attention.listByThreadId({ threadId, limit: 100 });
  return { sql, store, pipeline, attention, projectionState, append, thread, activity, list, base };
});

describe("current request attention", () => {
  it.effect("isolates multiple kinds, threads and turns; revisions change only materially", () =>
    Effect.gen(function* () {
      const f = yield* fixture;
      const threadId = ThreadId.make("thread");
      yield* f.thread();
      const first = yield* f.activity("approval.requested");
      yield* f.pipeline.projectEvent(first);
      yield* f.activity("approval.requested");
      const [opened] = yield* f.list();
      assert.equal(opened?.revision, 1);
      assert.equal(opened?.sourceEventId, first.eventId);
      assert.notMatch(Object.values(opened!).join(" "), /private/);
      yield* f.activity("user-input.requested");
      yield* f.activity("approval.requested", "other");
      yield* f.thread(ThreadId.make("another"), ProjectId.make("other-project"));
      yield* f.activity("approval.requested", "request", { threadId: ThreadId.make("another") });
      yield* f.activity("approval.resolved", "request", { turnId: TurnId.make("wrong-turn") });
      yield* f.append({
        ...f.base(threadId),
        type: "thread.approval-response-requested",
        payload: {
          threadId,
          requestId: ApprovalRequestId.make("request"),
          decision: "accept",
          createdAt: first.occurredAt,
        },
      });
      assert.equal((yield* f.list()).filter((row) => row.status === "open").length, 3);
      yield* f.activity("provider.approval.respond.failed");
      const failed = (yield* f.list()).find((row) => row.attentionId === opened?.attentionId)!;
      assert.equal(failed.status, "open");
      assert.equal(failed.reasonCode, "response_failed");
      assert.equal(failed.revision, 2);
      yield* f.activity("provider.approval.respond.failed");
      assert.deepEqual(
        (yield* f.list()).find((row) => row.attentionId === opened?.attentionId),
        failed,
      );
      const resolvedEvent = yield* f.activity("approval.resolved");
      yield* f.activity("provider.approval.respond.failed");
      yield* f.activity("approval.requested");
      const resolved = (yield* f.list()).find((row) => row.attentionId === opened?.attentionId)!;
      assert.equal(resolved.status, "resolved");
      assert.equal(resolved.revision, 3);
      assert.equal(resolved.sourceEventId, resolvedEvent.eventId);
      assert.equal((yield* f.list(ThreadId.make("another")))[0]?.status, "open");
      yield* f.activity("approval.requested", "request", { turnId: TurnId.make("next-turn") });
      yield* f.activity("approval.resolved", "request");
      assert.equal((yield* f.list()).find((row) => row.turnId === "next-turn")?.status, "open");
      yield* f.activity("user-input.resolved");
      assert.equal((yield* f.list()).find((row) => row.kind === "user_input")?.status, "resolved");
      yield* f.activity("approval.resolved", "unknown");
      assert.lengthOf(yield* f.list(), 4);
    }).pipe(Effect.provide(Layer.fresh(makeLayer()))),
  );

  it.effect(
    "resolves every open request on revert, deletes incarnations, and rebuilds without phantom imports",
    () =>
      Effect.gen(function* () {
        const f = yield* fixture;
        const threadId = ThreadId.make("thread");
        yield* f.thread();
        yield* f.activity("approval.requested", "imported", { historyImport: true });
        assert.deepEqual(yield* f.list(), []);
        yield* f.activity("approval.requested", "one");
        yield* f.activity("user-input.requested", "two");
        const revert = yield* f.append({
          ...f.base(threadId),
          type: "thread.reverted",
          payload: { threadId, turnCount: 0 },
        });
        const rows = yield* f.list();
        assert.lengthOf(rows, 2);
        assert.isTrue(
          rows.every(
            (row) =>
              row.status === "resolved" &&
              row.reasonCode === "thread_reverted" &&
              row.revision === 2 &&
              row.sourceEventId === revert.eventId,
          ),
        );
        const audit =
          yield* f.sql`SELECT * FROM projection_thread_attention_audit ORDER BY sequence`;
        yield* f.attention.reset;
        yield* f.pipeline.bootstrap;
        assert.deepEqual(yield* f.list(), rows);
        assert.deepEqual(
          yield* f.sql`SELECT * FROM projection_thread_attention_audit ORDER BY sequence`,
          audit,
        );
        const deleted = yield* f.append({
          ...f.base(threadId),
          type: "thread.deleted",
          payload: { threadId, deletedAt: "2026-09-27T00:00:00.000Z" },
        });
        assert.deepEqual(yield* f.list(), []);
        yield* f.activity("approval.requested", "late");
        assert.deepEqual(yield* f.list(), []);
        yield* f.pipeline.projectEvent(revert);
        const cursor = yield* f.projectionState.getByProjector({
          projector: CURRENT_ATTENTION_PROJECTOR,
        });
        assert.isTrue(Option.isSome(cursor) && cursor.value.lastAppliedSequence > deleted.sequence);
        yield* f.thread();
        yield* f.activity("approval.requested", "one");
        const recreated = yield* f.list();
        assert.lengthOf(recreated, 1);
        assert.isFalse(rows.some((row) => row.attentionId === recreated[0]?.attentionId));
        yield* f.attention.reset;
        yield* f.pipeline.bootstrap;
        assert.deepEqual(yield* f.list(), recreated);
      }).pipe(Effect.provide(Layer.fresh(makeLayer()))),
  );

  it.effect("rolls back rows and cursor together, retries, and purges a deleted project", () =>
    Effect.gen(function* () {
      const f = yield* fixture;
      yield* f.thread();
      const cursorBefore = yield* f.projectionState.getByProjector({
        projector: CURRENT_ATTENTION_PROJECTOR,
      });
      const event = yield* f.activity("approval.requested", "retry", { project: false });
      yield* f.sql`CREATE TRIGGER fail_attention_cursor BEFORE UPDATE ON projection_state
        WHEN NEW.projector = 'projection.thread-attention-current'
        BEGIN SELECT RAISE(ABORT, 'test rollback'); END`;
      const failed = yield* f.pipeline.projectEvent(event).pipe(Effect.result);
      assert.equal(failed._tag, "Failure");
      assert.deepEqual(yield* f.list(), []);
      assert.deepEqual(
        yield* f.projectionState.getByProjector({ projector: CURRENT_ATTENTION_PROJECTOR }),
        cursorBefore,
      );
      yield* f.sql`DROP TRIGGER fail_attention_cursor`;
      yield* f.pipeline.projectEvent(event);
      assert.equal((yield* f.list())[0]?.revision, 1);
      yield* f.thread(ThreadId.make("second"));
      yield* f.activity("user-input.requested", "two", { threadId: ThreadId.make("second") });
      const projectId = ProjectId.make("project");
      yield* f.append({
        ...f.base(ThreadId.make("thread")),
        aggregateKind: "project",
        aggregateId: projectId,
        type: "project.deleted",
        payload: { projectId, deletedAt: event.occurredAt },
      });
      assert.deepEqual(yield* f.list(), []);
      assert.deepEqual(yield* f.list(ThreadId.make("second")), []);
      yield* f.attention.reset;
      yield* f.pipeline.bootstrap;
      assert.deepEqual(yield* f.list(), []);
      assert.deepEqual(yield* f.list(ThreadId.make("second")), []);
    }).pipe(Effect.provide(Layer.fresh(makeLayer()))),
  );

  it.effect("does not guess an unscoped reply across reused request IDs and bounds queries", () =>
    Effect.gen(function* () {
      const f = yield* fixture;
      yield* f.thread();
      yield* f.activity("approval.requested");
      yield* f.activity("approval.requested", "request", { turnId: TurnId.make("second") });
      yield* f.activity("approval.resolved", "request", { turnId: null });
      assert.isTrue((yield* f.list()).every((row) => row.status === "open"));
      yield* f.activity("approval.resolved");
      yield* f.activity("approval.resolved", "request", { turnId: null });
      assert.equal((yield* f.list()).find((row) => row.turnId === "second")?.status, "open");
      const firstPage = yield* f.attention.listByThreadId({
        threadId: ThreadId.make("thread"),
        limit: 1,
      });
      const nextPage = yield* f.attention.listByThreadId({
        threadId: ThreadId.make("thread"),
        limit: 1,
        afterAttentionId: firstPage[0]!.attentionId,
      });
      assert.equal(firstPage.length + nextPage.length, 2);
      assert.notEqual(firstPage[0]?.attentionId, nextPage[0]?.attentionId);
      assert.equal(
        (yield* f.attention
          .listByThreadId({ threadId: ThreadId.make("thread"), limit: 101 })
          .pipe(Effect.result))._tag,
        "Failure",
      );
    }).pipe(Effect.provide(Layer.fresh(makeLayer()))),
  );

  it.effect(
    "uses legacy metadata identity and ignores imported resolutions and raw failure text",
    () =>
      Effect.gen(function* () {
        const f = yield* fixture;
        const threadId = ThreadId.make("thread");
        yield* f.thread();
        const base = f.base(threadId);
        yield* f.append({
          ...base,
          type: "thread.activity-appended",
          metadata: { requestId: ApprovalRequestId.make("legacy") },
          payload: {
            threadId,
            activity: {
              id: base.eventId,
              kind: "user-input.requested",
              tone: "info",
              summary: "private question",
              payload: {},
              turnId: null,
              createdAt: base.occurredAt,
            },
          },
        });
        yield* f.activity("user-input.resolved", "legacy", { turnId: null, historyImport: true });
        assert.equal((yield* f.list())[0]?.status, "open");
        yield* f.activity("provider.user-input.respond.failed", "legacy", { turnId: null });
        const failed = (yield* f.list())[0]!;
        assert.equal(failed.reasonCode, "response_failed");
        assert.equal(failed.revision, 2);
        assert.notMatch(Object.values(failed).join(" "), /private/);
        yield* f.activity("user-input.resolved", "legacy", { turnId: null });
        yield* f.activity("provider.user-input.respond.failed", "legacy", { turnId: null });
        assert.equal((yield* f.list())[0]?.revision, 3);
        assert.equal((yield* f.list())[0]?.status, "resolved");
        const invalid = yield* f.activity("approval.requested", "", { project: false });
        yield* f.sql.withTransaction(f.attention.project(invalid));
        assert.lengthOf(yield* f.list(), 1);
      }).pipe(Effect.provide(Layer.fresh(makeLayer()))),
  );

  it.effect(
    "reopens disk state, applies its missed tail once and rebuilds the same revisions",
    () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const directory = yield* fs.makeTempDirectoryScoped({ prefix: "t3-attention-restart-" });
        const dbPath = path.join(directory, "state.sqlite");
        const saved = yield* Effect.gen(function* () {
          const f = yield* fixture;
          yield* f.thread();
          yield* f.activity("approval.requested");
          yield* f.activity("user-input.requested", "input");
          const missed = yield* f.activity("provider.user-input.respond.failed", "input", {
            project: false,
          });
          return { rows: yield* f.list(), missed };
        }).pipe(Effect.provide(Layer.fresh(makeLayer(dbPath))));
        yield* Effect.gen(function* () {
          const attention = yield* ProjectionThreadAttentionCurrentRepository;
          const pipeline = yield* OrchestrationProjectionPipeline;
          const projectionState = yield* ProjectionStateRepository;
          const list = () =>
            attention.listByThreadId({ threadId: ThreadId.make("thread"), limit: 100 });
          assert.deepEqual(yield* list(), saved.rows);
          yield* pipeline.bootstrap;
          const caughtUp = yield* list();
          assert.equal(caughtUp.find((row) => row.kind === "approval")?.revision, 1);
          assert.equal(caughtUp.find((row) => row.kind === "user_input")?.revision, 2);
          assert.equal(
            caughtUp.find((row) => row.kind === "user_input")?.reasonCode,
            "response_failed",
          );
          yield* pipeline.projectEvent(saved.missed);
          assert.deepEqual(yield* list(), caughtUp);
          yield* attention.reset;
          yield* pipeline.bootstrap;
          assert.deepEqual(yield* list(), caughtUp);
          const cursor = yield* projectionState.getByProjector({
            projector: CURRENT_ATTENTION_PROJECTOR,
          });
          assert.isTrue(
            Option.isSome(cursor) && cursor.value.lastAppliedSequence === saved.missed.sequence,
          );
        }).pipe(Effect.provide(Layer.fresh(makeLayer(dbPath))));
      }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );
});
