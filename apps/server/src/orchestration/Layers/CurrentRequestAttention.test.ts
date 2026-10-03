import {
  ApprovalRequestId,
  CommandId,
  EventId,
  type OrchestrationEvent,
  ProjectId,
  ProviderInstanceId,
  type ProviderLifecycleEvidence,
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
      responseMode?: "message";
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
              ...(options.responseMode ? { responseMode: options.responseMode } : {}),
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
  const lifecycle = Effect.fn("test.attentionLifecycle")(function* (
    transition: ProviderLifecycleEvidence["transition"],
    options: {
      turnId?: TurnId | null;
      providerKey?: string;
      project?: boolean;
      historyImport?: boolean;
      occurredAt?: string;
      providerEventId?: EventId;
    } = {},
  ) {
    const threadId = ThreadId.make("thread");
    const event = base(threadId);
    const turnId = options.turnId === undefined ? TurnId.make("turn") : options.turnId;
    const providerKey = options.providerKey ?? "githubCopilot";
    return yield* append(
      {
        ...event,
        ...(options.occurredAt ? { occurredAt: options.occurredAt } : {}),
        type: "thread.session-set",
        metadata: options.historyImport ? { historyImport: true } : {},
        payload: {
          threadId,
          session: {
            threadId,
            status:
              transition === "failed"
                ? "error"
                : transition === "disconnected"
                  ? "stopped"
                  : transition === "interrupted"
                    ? "interrupted"
                    : transition === "completed"
                      ? "ready"
                      : transition,
            providerName: "githubCopilot",
            providerInstanceId: ProviderInstanceId.make(providerKey),
            runtimeMode: "approval-required",
            activeTurnId: transition === "running" ? turnId : null,
            lastError: transition === "failed" ? "private provider failure text" : null,
            updatedAt: event.occurredAt,
          },
          lifecycle: {
            providerEventId: options.providerEventId ?? event.eventId,
            providerKey,
            turnId,
            transition,
            ...(transition === "failed" ? { failureReason: "provider_failed" as const } : {}),
          },
        },
      },
      options.project ?? true,
    );
  });
  const summary = () =>
    attention.getSummary(ThreadId.make("thread")).pipe(Effect.map(Option.getOrThrow));
  return {
    sql,
    store,
    pipeline,
    attention,
    projectionState,
    append,
    thread,
    activity,
    list,
    base,
    lifecycle,
    summary,
  };
});

describe("current request attention", () => {
  it.effect(
    "persists a disconnect across disk reopen and resolves it after explicit same-turn recovery",
    () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const directory = yield* fs.makeTempDirectoryScoped({ prefix: "t3-awareness-restart-" });
        const dbPath = path.join(directory, "state.sqlite");
        const before = yield* Effect.gen(function* () {
          const f = yield* fixture;
          yield* f.thread();
          yield* f.lifecycle("running");
          yield* f.lifecycle("disconnected");
          return { rows: yield* f.list(), summary: yield* f.summary() };
        }).pipe(Effect.provide(Layer.fresh(makeLayer(dbPath))));
        yield* Effect.gen(function* () {
          const f = yield* fixture;
          assert.deepEqual({ rows: yield* f.list(), summary: yield* f.summary() }, before);
          yield* f.pipeline.bootstrap;
          assert.deepEqual({ rows: yield* f.list(), summary: yield* f.summary() }, before);
          const threadId = ThreadId.make("thread");
          yield* f.append({
            eventId: EventId.make("recovered-after-restart"),
            commandId: CommandId.make("restart-command"),
            aggregateKind: "thread",
            aggregateId: threadId,
            occurredAt: "2026-09-27T00:00:01Z",
            causationEventId: null,
            correlationId: null,
            metadata: {},
            type: "thread.session-set",
            payload: {
              threadId,
              session: {
                threadId,
                status: "running",
                providerName: "githubCopilot",
                runtimeMode: "approval-required",
                activeTurnId: TurnId.make("turn"),
                lastError: null,
                updatedAt: "2026-09-27T00:00:01Z",
              },
              lifecycle: {
                providerEventId: EventId.make("running-after-restart"),
                providerKey: "githubCopilot",
                turnId: TurnId.make("turn"),
                transition: "running",
              },
            },
          });
          const recovered = { rows: yield* f.list(), summary: yield* f.summary() };
          assert.equal(recovered.summary.disconnectCount, 0);
          assert.equal(recovered.summary.phase, "running");
          assert.equal(recovered.rows[0]?.reasonCode, "provider_recovered");
          yield* f.attention.reset;
          yield* f.pipeline.bootstrap;
          assert.deepEqual({ rows: yield* f.list(), summary: yield* f.summary() }, recovered);
        }).pipe(Effect.provide(Layer.fresh(makeLayer(dbPath))));
      }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );

  it.effect("keeps message-mode questions actionable after native turn completion", () =>
    Effect.gen(function* () {
      const f = yield* fixture;
      yield* f.thread();
      yield* f.lifecycle("running");
      yield* f.activity("user-input.requested", "callback");
      yield* f.activity("user-input.requested", "message", { responseMode: "message" });
      yield* f.lifecycle("completed");
      assert.equal(
        (yield* f.list()).find((row) => row.requestId === "callback")?.status,
        "resolved",
      );
      assert.equal((yield* f.list()).find((row) => row.requestId === "message")?.status, "open");
      assert.equal((yield* f.summary()).phase, "waiting_for_input");
      yield* f.activity("user-input.requested", "late-message", { responseMode: "message" });
      assert.equal((yield* f.summary()).inputCount, 2);
      yield* f.activity("user-input.resolved", "message");
      yield* f.activity("user-input.resolved", "late-message");
      assert.equal((yield* f.summary()).phase, "completed");
      const expected = { rows: yield* f.list(), summary: yield* f.summary() };
      yield* f.attention.reset;
      yield* f.pipeline.bootstrap;
      assert.deepEqual({ rows: yield* f.list(), summary: yield* f.summary() }, expected);
    }).pipe(Effect.provide(Layer.fresh(makeLayer()))),
  );

  it.effect("bounds summary output and counts overflow without limiting the detail set", () =>
    Effect.gen(function* () {
      const f = yield* fixture;
      yield* f.thread();
      yield* f.sql`WITH RECURSIVE requests(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM requests WHERE n < 1001)
        INSERT INTO projection_thread_attention_current
          (attention_id, project_id, thread_id, turn_id, request_id, kind, status, reason_code, revision,
           source_event_id, source_sequence, opened_at, updated_at, resolved_at)
        SELECT printf('%064x', n), 'project', 'thread', 'turn', printf('req-%d',n),
          'approval', 'open', 'approval_requested', 1, printf('event-%d',n), n,
          '2026-09-27T00:00:00.000Z', '2026-09-27T00:00:00.000Z', NULL FROM requests`;
      yield* f.lifecycle("running");
      const saturated = yield* f.summary();
      assert.equal(saturated.approvalCount, 999);
      assert.isTrue(saturated.countsOverflowed);
      assert.lengthOf(yield* f.list(), 100);
      yield* f.sql`UPDATE projection_thread_attention_current
        SET status = 'resolved', reason_code = 'request_resolved', resolved_at = updated_at
        WHERE request_id IN ('req-1', 'req-2')`;
      yield* f.lifecycle("running");
      const exact = yield* f.summary();
      assert.equal(exact.approvalCount, 999);
      assert.isFalse(exact.countsOverflowed);
      assert.equal(exact.revision, saturated.revision + 1);
      yield* f.lifecycle("completed");
      assert.equal((yield* f.summary()).approvalCount, 0);
    }).pipe(Effect.provide(Layer.fresh(makeLayer()))),
  );

  it.effect("ignores replayed provider observations and late pre-recovery errors", () =>
    Effect.gen(function* () {
      const f = yield* fixture;
      yield* f.thread();
      yield* f.lifecycle("running", { occurredAt: "2026-09-27T00:00:01Z" });
      const eventId = EventId.make("failed-observation");
      yield* f.lifecycle("failed", {
        providerEventId: eventId,
        occurredAt: "2026-09-27T00:00:02Z",
      });
      yield* f.lifecycle("running", { occurredAt: "2026-09-27T00:00:03Z" });
      const recovered = { rows: yield* f.list(), summary: yield* f.summary() };
      yield* f.lifecycle("failed", {
        providerEventId: eventId,
        occurredAt: "2026-09-27T00:00:04Z",
      });
      yield* f.lifecycle("disconnected", { occurredAt: "2026-09-27T00:00:01Z" });
      assert.deepEqual({ rows: yield* f.list(), summary: yield* f.summary() }, recovered);
      yield* f.lifecycle("running", {
        turnId: TurnId.make("other"),
        providerKey: "other",
        occurredAt: "2026-09-27T00:00:04Z",
      });
      yield* f.lifecycle("failed", {
        turnId: TurnId.make("other"),
        providerKey: "other",
        occurredAt: "2026-09-27T00:00:05Z",
      });
      assert.deepEqual({ rows: yield* f.list(), summary: yield* f.summary() }, recovered);
      yield* f.attention.reset;
      yield* f.pipeline.bootstrap;
      assert.deepEqual({ rows: yield* f.list(), summary: yield* f.summary() }, recovered);
    }).pipe(Effect.provide(Layer.fresh(makeLayer()))),
  );

  it.effect("projects bounded phases and completes only the matching turn's requests", () =>
    Effect.gen(function* () {
      const f = yield* fixture;
      yield* f.thread();
      assert.equal((yield* f.summary()).phase, null);
      yield* f.lifecycle("starting");
      assert.equal((yield* f.summary()).phase, "starting");
      yield* f.lifecycle("running");
      assert.equal((yield* f.summary()).phase, "running");
      yield* f.activity("approval.requested", "approve");
      yield* f.activity("user-input.requested", "input");
      yield* f.activity("approval.requested", "other-turn", { turnId: TurnId.make("other") });
      const waiting = yield* f.summary();
      assert.equal(waiting.phase, "waiting_for_approval");
      assert.equal(waiting.approvalCount, 2);
      assert.equal(waiting.inputCount, 1);
      yield* f.activity("provider.approval.respond.failed", "approve");
      assert.deepEqual(yield* f.summary(), waiting);
      yield* f.lifecycle("completed");
      const rows = yield* f.list();
      assert.equal(rows.find((row) => row.requestId === "other-turn")?.status, "open");
      assert.isTrue(
        rows.filter((row) => row.turnId === "turn").every((row) => row.status === "resolved"),
      );
      assert.equal((yield* f.summary()).approvalCount, 1);
      yield* f.activity("approval.resolved", "other-turn", { turnId: TurnId.make("other") });
      assert.equal((yield* f.summary()).phase, "completed");
      assert.equal((yield* f.summary()).failureCount, 0);
      const completed = yield* f.summary();
      yield* f.lifecycle("starting");
      yield* f.lifecycle("running");
      yield* f.lifecycle("failed");
      yield* f.activity("approval.requested", "late");
      assert.deepEqual(yield* f.summary(), completed);
      assert.isFalse((yield* f.list()).some((row) => row.requestId === "late"));
    }).pipe(Effect.provide(Layer.fresh(makeLayer()))),
  );

  it.effect(
    "opens scoped failures and resolves them only on matching recovery, never unrelated work or seen state",
    () =>
      Effect.gen(function* () {
        const f = yield* fixture;
        yield* f.thread();
        yield* f.lifecycle("running");
        yield* f.activity("approval.requested");
        const failedEvent = yield* f.lifecycle("failed");
        const failure = (yield* f.list()).find((row) => row.kind === "failure")!;
        assert.equal(failure.status, "open");
        assert.equal(failure.reasonCode, "provider_failed");
        assert.notMatch(Object.values(failure).join(" "), /private/);
        assert.equal((yield* f.summary()).phase, "failed");
        assert.equal((yield* f.summary()).approvalCount, 0);
        yield* f.pipeline.projectEvent(failedEvent);
        yield* f.lifecycle("failed");
        assert.deepEqual(
          (yield* f.list()).find((row) => row.kind === "failure"),
          failure,
        );
        yield* f.lifecycle("ready");
        yield* f.activity("client.attention.seen");
        assert.equal((yield* f.list()).find((row) => row.kind === "failure")?.status, "open");
        yield* f.lifecycle("running");
        assert.equal(
          (yield* f.list()).find((row) => row.kind === "failure")?.reasonCode,
          "provider_recovered",
        );
        yield* f.lifecycle("failed");
        const secondFailure = (yield* f.list()).find(
          (row) => row.kind === "failure" && row.status === "open",
        )!;
        assert.notEqual(secondFailure.attentionId, failure.attentionId);
        yield* f.lifecycle("running", { turnId: TurnId.make("new") });
        yield* f.lifecycle("completed", { turnId: TurnId.make("new") });
        assert.equal((yield* f.summary()).phase, "completed");
        assert.equal((yield* f.summary()).failureCount, 1);
        assert.equal(
          (yield* f.list()).find((row) => row.attentionId === secondFailure.attentionId)?.status,
          "open",
        );
      }).pipe(Effect.provide(Layer.fresh(makeLayer()))),
  );

  it.effect(
    "distinguishes active provider loss, matching reconnect, client network loss and intentional stop",
    () =>
      Effect.gen(function* () {
        const f = yield* fixture;
        yield* f.thread();
        yield* f.lifecycle("disconnected");
        assert.equal((yield* f.summary()).disconnectCount, 0);
        yield* f.lifecycle("running");
        const running = yield* f.summary();
        yield* f.activity("client.connection.lost");
        assert.deepEqual(yield* f.summary(), running);
        yield* f.activity("user-input.requested");
        yield* f.lifecycle("disconnected");
        const stale = yield* f.summary();
        assert.equal(stale.phase, "stale");
        assert.equal(stale.disconnectCount, 1);
        assert.equal(stale.inputCount, 1);
        yield* f.lifecycle("ready");
        yield* f.lifecycle("running", { turnId: null });
        assert.deepEqual(yield* f.summary(), stale);
        yield* f.lifecycle("running");
        assert.equal((yield* f.summary()).disconnectCount, 0);
        assert.equal((yield* f.summary()).phase, "waiting_for_input");
        const threadId = ThreadId.make("thread");
        yield* f.append({
          ...f.base(threadId),
          type: "thread.session-stop-requested",
          payload: { threadId, createdAt: "2026-09-27T00:00:00.000Z" },
        });
        yield* f.lifecycle("disconnected", { turnId: null });
        assert.equal((yield* f.summary()).disconnectCount, 0);
        assert.equal((yield* f.summary()).phase, null);
        assert.equal((yield* f.summary()).inputCount, 0);
      }).pipe(Effect.provide(Layer.fresh(makeLayer()))),
  );

  it.effect(
    "rolls back failure rows, turn evidence, summary and cursor together and rebuilds deterministically",
    () =>
      Effect.gen(function* () {
        const f = yield* fixture;
        yield* f.thread();
        yield* f.lifecycle("running");
        const before = yield* f.summary();
        const event = yield* f.lifecycle("failed", { project: false });
        yield* f.sql`CREATE TRIGGER fail_summary BEFORE UPDATE ON projection_thread_awareness
        WHEN NEW.phase = 'failed' BEGIN SELECT RAISE(ABORT, 'test rollback'); END`;
        assert.equal((yield* f.pipeline.projectEvent(event).pipe(Effect.result))._tag, "Failure");
        assert.deepEqual(yield* f.summary(), before);
        assert.deepEqual(yield* f.list(), []);
        const cursor = yield* f.projectionState.getByProjector({
          projector: CURRENT_ATTENTION_PROJECTOR,
        });
        assert.isTrue(Option.isSome(cursor) && cursor.value.lastAppliedSequence < event.sequence);
        yield* f.sql`DROP TRIGGER fail_summary`;
        yield* f.pipeline.projectEvent(event);
        const state = { summary: yield* f.summary(), rows: yield* f.list() };
        yield* f.attention.reset;
        yield* f.pipeline.bootstrap;
        assert.deepEqual({ summary: yield* f.summary(), rows: yield* f.list() }, state);
        yield* f.lifecycle("completed", { historyImport: true });
        assert.deepEqual({ summary: yield* f.summary(), rows: yield* f.list() }, state);
        const threadId = ThreadId.make("thread");
        yield* f.append({
          ...f.base(threadId),
          type: "thread.reverted",
          payload: { threadId, turnCount: 0 },
        });
        assert.equal((yield* f.summary()).failureCount, 0);
        yield* f.lifecycle("failed");
        assert.equal((yield* f.summary()).failureCount, 0);
      }).pipe(Effect.provide(Layer.fresh(makeLayer()))),
  );

  it.effect(
    "clears lifecycle state on deletion/recreation without recreating a prior failure",
    () =>
      Effect.gen(function* () {
        const f = yield* fixture;
        const threadId = ThreadId.make("thread");
        yield* f.thread();
        yield* f.lifecycle("running");
        yield* f.lifecycle("failed");
        const oldFailure = (yield* f.list())[0]!;
        yield* f.append({
          ...f.base(threadId),
          type: "thread.deleted",
          payload: { threadId, deletedAt: "2026-09-27T00:00:00.000Z" },
        });
        yield* f.lifecycle("failed");
        assert.isTrue(Option.isNone(yield* f.attention.getSummary(threadId)));
        assert.deepEqual(yield* f.list(), []);
        yield* f.thread();
        assert.equal((yield* f.summary()).phase, null);
        yield* f.lifecycle("running");
        yield* f.lifecycle("failed");
        assert.notEqual((yield* f.list())[0]?.attentionId, oldFailure.attentionId);
        const projectId = ProjectId.make("project");
        yield* f.append({
          ...f.base(threadId),
          aggregateKind: "project",
          aggregateId: projectId,
          type: "project.deleted",
          payload: { projectId, deletedAt: "2026-09-27T00:00:00.000Z" },
        });
        assert.isTrue(Option.isNone(yield* f.attention.getSummary(threadId)));
        yield* f.attention.reset;
        yield* f.pipeline.bootstrap;
        assert.isTrue(Option.isNone(yield* f.attention.getSummary(threadId)));
        assert.deepEqual(yield* f.list(), []);
      }).pipe(Effect.provide(Layer.fresh(makeLayer()))),
  );

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
