import {
  CommandId,
  EventId,
  EnvironmentId,
  ProjectId,
  ProviderInstanceId,
  ThreadId,
  TurnId,
  EnvironmentAuthorizationError,
  AuthOrchestrationReadScope,
  type AttentionSubscribeInput,
  type AttentionStreamMessage,
  AttentionEntity,
  AttentionDeliveryCursor,
} from "@t3tools/contracts";
import {
  emptyAttentionSync,
  reduceAttentionStream,
  attentionSyncFailed,
} from "@t3tools/client-runtime/attention-sync";
import * as HashMap from "effect/HashMap";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import * as TestClock from "effect/testing/TestClock";
import * as PubSub from "effect/PubSub";
import * as Fiber from "effect/Fiber";
import * as Deferred from "effect/Deferred";
import * as Schema from "effect/Schema";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, describe, it } from "@effect/vitest";
import {
  SqlitePersistenceMemory,
  makeSqlitePersistenceLive,
} from "../persistence/Layers/Sqlite.ts";
import * as RepositoryIdentityResolver from "../project/RepositoryIdentityResolver.ts";
import { OrchestrationLayerLive } from "./runtimeLayer.ts";
import { ServerConfig } from "../config.ts";
import { OrchestrationEngineService } from "./Services/OrchestrationEngine.ts";
import { ProjectionThreadAttentionCurrentRepository } from "../persistence/Services/ProjectionThreadAttentionCurrent.ts";
import { OrchestrationProjectionPipeline } from "./Services/ProjectionPipeline.ts";
import { makeAttentionStream, ATTENTION_BOOTSTRAP_MS } from "./AttentionSync.ts";
const decodeEntity = Schema.decodeUnknownEffect(Schema.fromJsonString(AttentionEntity));

const layer = (dbPath?: string) =>
  OrchestrationLayerLive.pipe(
    Layer.provideMerge(RepositoryIdentityResolver.layer),
    Layer.provideMerge(dbPath ? makeSqlitePersistenceLive(dbPath) : SqlitePersistenceMemory),
    Layer.provideMerge(ServerConfig.layerTest(process.cwd(), { prefix: "t3-attention-sync-" })),
    Layer.provideMerge(NodeServices.layer),
  );
const setup = Effect.gen(function* () {
  const engine = yield* OrchestrationEngineService;
  const sql = yield* SqlClient.SqlClient;
  const attention = yield* ProjectionThreadAttentionCurrentRepository;
  const pipeline = yield* OrchestrationProjectionPipeline;
  let id = 0;
  let allowed = true;
  const authorization = yield* PubSub.unbounded<void>();
  const options = {
    environmentId: EnvironmentId.make("env"),
    scopeBinding: "session:orchestration:read",
    secret: new Uint8Array(32).fill(7),
    authorize: Effect.suspend(() =>
      allowed
        ? Effect.void
        : Effect.fail(
            new EnvironmentAuthorizationError({
              requiredScope: AuthOrchestrationReadScope,
              message: "Session revoked.",
            }),
          ),
    ),
    authorizationChanges: Stream.fromPubSub(authorization),
  };
  const now = "2026-09-28T00:00:00.000Z";
  const command = () => CommandId.make(`sync-command-${++id}`);
  const project = ProjectId.make("project");
  yield* engine.dispatch({
    type: "project.create",
    commandId: command(),
    projectId: project,
    title: "Project",
    workspaceRoot: "/tmp/attention-fixture",
    defaultModelSelection: null,
    createdAt: now,
  });
  const thread = (name: string) =>
    engine.dispatch({
      type: "thread.create",
      commandId: command(),
      threadId: ThreadId.make(name),
      projectId: project,
      title: name,
      modelSelection: { instanceId: ProviderInstanceId.make("codex"), model: "gpt-5-mini" },
      runtimeMode: "approval-required",
      interactionMode: "default",
      branch: null,
      worktreePath: null,
      createdAt: now,
    });
  const activity = (threadId: string, kind: string, requestId: string) =>
    engine.dispatch({
      type: "thread.activity.append",
      commandId: command(),
      threadId: ThreadId.make(threadId),
      createdAt: now,
      activity: {
        id: EventId.make(`sync-activity-${id}`),
        kind,
        turnId: TurnId.make("turn"),
        tone: "info",
        summary: "private",
        payload: { requestId, detail: "private command" },
        createdAt: now,
      },
    });
  const connect = Effect.fn("test.connectAttention")(function* (
    input: AttentionSubscribeInput = {},
  ) {
    const pull = yield* Stream.toPull(makeAttentionStream(input, options));
    const next = () =>
      pull.pipe(
        Effect.map((frames) => {
          assert.lengthOf(frames, 1);
          return frames[0]!;
        }),
      );
    return { next };
  });
  const revoke = Effect.gen(function* () {
    allowed = false;
    yield* PubSub.publish(authorization, undefined);
  });
  return {
    engine,
    sql,
    attention,
    pipeline,
    options,
    thread,
    activity,
    command,
    connect,
    revoke,
    now,
  };
});

describe("attention snapshot/live continuity", () => {
  it.effect("rotates delivery generation across a real disk-backed server restart", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const directory = yield* fs.makeTempDirectoryScoped({
        prefix: "t3-attention-delivery-restart-",
      });
      const db = path.join(directory, "state.sqlite");
      const cursor = yield* Effect.gen(function* () {
        const f = yield* setup;
        yield* f.thread("thread");
        const stream = yield* f.connect();
        let cache = emptyAttentionSync();
        while (cache.status !== "live") cache = reduceAttentionStream(cache, yield* stream.next());
        return cache.cursor!;
      }).pipe(Effect.scoped, Effect.provide(Layer.fresh(layer(db))));
      yield* Effect.gen(function* () {
        const f = yield* setup;
        const stream = yield* f.connect({ cursor });
        assert.deepEqual(yield* stream.next(), {
          type: "reset-required",
          reason: "generation-changed",
        });
        const fresh = yield* f.connect();
        let cache = emptyAttentionSync();
        while (cache.status !== "live") cache = reduceAttentionStream(cache, yield* fresh.next());
        assert.equal(HashMap.size(cache.entries), 1);
      }).pipe(Effect.scoped, Effect.provide(Layer.fresh(layer(db))));
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );
  it.effect(
    "synchronizes more than 100 items and summaries across mutable pages, removals and recreation",
    () =>
      Effect.gen(function* () {
        const f = yield* setup;
        for (let i = 0; i < 105; i++) {
          yield* f.thread(`thread-${i}`);
          yield* f.activity(`thread-${i}`, "approval.requested", "request");
        }
        const stream = yield* f.connect({ pageSize: 17 });
        let cache = emptyAttentionSync();
        const frames: AttentionStreamMessage[] = [];
        const read = Effect.gen(function* () {
          const frame = yield* stream.next();
          frames.push(frame);
          cache = reduceAttentionStream(cache, frame);
          assert.notEqual(cache.status, "reset-required");
          assert.lengthOf(cache.notificationCandidates, 0);
          return frame;
        });
        assert.equal((yield* read).type, "begin");
        assert.equal((yield* read).type, "page");
        yield* f.activity("thread-0", "approval.resolved", "request");
        yield* f.engine.dispatch({
          type: "thread.delete",
          commandId: f.command(),
          threadId: ThreadId.make("thread-1"),
        });
        yield* f.thread("thread-1");
        yield* f.activity("thread-1", "user-input.requested", "new");
        yield* f.thread("000-insert-before-keyset");
        yield* f.activity("000-insert-before-keyset", "approval.requested", "new");
        let beforeFence = false;
        while (true) {
          const frame = yield* read;
          if (frame.type === "sync-complete") break;
          if (frame.type === "page" && frame.entries.length < 17 && !beforeFence) {
            beforeFence = true;
            yield* f.activity("thread-3", "user-input.requested", "between-page-and-fence");
          }
          assert.equal(HashMap.size(cache.entries), 0);
          assert.isBelow(frames.length, 100);
        }
        assert.isTrue(beforeFence);
        const expected = yield* f.sql<{
          readonly entity_key: string;
          readonly data_json: string;
          readonly version: number;
        }>`
        SELECT entity_key, data_json, version FROM attention_delivery_rows WHERE status != 'resolved' ORDER BY entity_key
      `;
        const decoded = yield* Effect.forEach(expected, (row) =>
          decodeEntity(row.data_json).pipe(
            Effect.map((entity) => ({
              key: row.entity_key,
              version: row.version,
              entity,
            })),
          ),
        );
        assert.deepEqual(
          [...HashMap.values(cache.entries)].sort((a, b) => a.key.localeCompare(b.key)),
          decoded,
        );
        assert.isAbove(HashMap.size(cache.entries), 200);
        yield* f.activity("thread-2", "approval.resolved", "request");
        const live = yield* stream.next();
        assert.equal(live.type, "delta");
        cache = reduceAttentionStream(cache, live);
        assert.equal(cache.status, "live");
        assert.isAbove(cache.notificationCandidates.length, 0);
      }).pipe(Effect.scoped, Effect.provide(Layer.fresh(layer()))),
  );

  it.effect(
    "resumes only a complete replay interval and rejects altered scope or malformed cursors",
    () =>
      Effect.gen(function* () {
        const f = yield* setup;
        yield* f.thread("thread");
        const stream = yield* f.connect();
        let cache = emptyAttentionSync();
        while (cache.status !== "live") cache = reduceAttentionStream(cache, yield* stream.next());
        const cursor = cache.cursor!;
        yield* f.activity("thread", "approval.requested", "request");
        const resumed = yield* f.connect({ cursor });
        cache = attentionSyncFailed(cache, "disconnected");
        while (cache.status !== "live") {
          cache = reduceAttentionStream(cache, yield* resumed.next());
          assert.lengthOf(cache.notificationCandidates, 0);
        }
        assert.equal(HashMap.size(cache.entries), 2);
        const changed = yield* f.connect({ cursor, filter: { includeResolved: true } });
        const failure = yield* changed.next().pipe(Effect.result);
        assert.equal(failure._tag, "Failure");
        const badScope = yield* Stream.runHead(
          makeAttentionStream(
            { cursor },
            { ...f.options, environmentId: EnvironmentId.make("other") },
          ),
        ).pipe(Effect.result);
        assert.equal(badScope._tag, "Failure");
        const malformed = yield* f.connect({
          cursor: AttentionDeliveryCursor.make("invalid.token"),
        });
        assert.equal((yield* malformed.next().pipe(Effect.result))._tag, "Failure");
        yield* f.sql`DELETE FROM attention_delivery_changes`;
        yield* f.sql`UPDATE attention_delivery_state SET floor = head`;
        const expired = yield* f.connect({ cursor });
        assert.deepEqual(yield* expired.next(), {
          type: "reset-required",
          reason: "replay-unavailable",
        });
      }).pipe(Effect.scoped, Effect.provide(Layer.fresh(layer()))),
  );

  it.effect("resets on rebuild and bootstrap expiry instead of claiming an incomplete fence", () =>
    Effect.gen(function* () {
      const f = yield* setup;
      yield* f.thread("thread");
      const stream = yield* f.connect({ pageSize: 1 });
      yield* stream.next();
      yield* f.attention.reset;
      yield* f.pipeline.bootstrap;
      assert.deepEqual(yield* stream.next(), {
        type: "reset-required",
        reason: "generation-changed",
      });
      const expired = yield* f.connect();
      yield* expired.next();
      yield* TestClock.adjust(ATTENTION_BOOTSTRAP_MS + 1);
      assert.deepEqual(yield* expired.next(), {
        type: "reset-required",
        reason: "bootstrap-expired",
      });
    }).pipe(Effect.scoped, Effect.provide(Layer.fresh(layer()))),
  );

  it.effect("emits empty filtered deltas and surfaces revoked authority while idle", () =>
    Effect.gen(function* () {
      const f = yield* setup;
      yield* f.thread("thread");
      const stream = yield* f.connect({
        filter: { threadIds: [ThreadId.make("not-this-thread")] },
      });
      let cache = emptyAttentionSync();
      while (cache.status !== "live") cache = reduceAttentionStream(cache, yield* stream.next());
      assert.equal(HashMap.size(cache.entries), 0);
      yield* f.activity("thread", "approval.requested", "request");
      const change = yield* stream.next();
      assert.equal(change.type, "delta");
      if (change.type === "delta") assert.deepEqual(change.changes, []);
      const waiting = yield* stream.next().pipe(Effect.forkScoped);
      yield* f.revoke;
      assert.equal((yield* Fiber.join(waiting).pipe(Effect.result))._tag, "Failure");
      assert.equal(attentionSyncFailed(cache, "unauthorized").status, "reset-required");
    }).pipe(Effect.scoped, Effect.provide(Layer.fresh(layer()))),
  );

  it.effect(
    "registers before a committed watermark and never reads an in-flight rolled-back projection",
    () =>
      Effect.gen(function* () {
        const f = yield* setup;
        yield* f.thread("thread");
        const registered = yield* Deferred.make<void>();
        const proceed = yield* Deferred.make<void>();
        const pull = yield* Stream.toPull(
          makeAttentionStream({}, f.options).pipe(
            Stream.provideService(OrchestrationEngineService, {
              ...f.engine,
              subscribeDomainEvents: f.engine.subscribeDomainEvents.pipe(
                Effect.tap(() =>
                  Deferred.succeed(registered, undefined).pipe(
                    Effect.andThen(Deferred.await(proceed)),
                  ),
                ),
              ),
            }),
          ),
        );
        const first = yield* pull.pipe(Effect.forkScoped);
        yield* Deferred.await(registered);
        yield* f.activity("thread", "approval.requested", "during-registration");
        yield* Deferred.succeed(proceed, undefined);
        let cache = reduceAttentionStream(emptyAttentionSync(), (yield* Fiber.join(first))[0]!);
        const written = yield* Deferred.make<void>();
        const rollback = yield* Deferred.make<void>();
        const transaction = yield* f.sql
          .withTransaction(
            Effect.gen(function* () {
              yield* f.sql`UPDATE projection_thread_attention_current SET reason_code = 'response_failed', revision = revision + 1`;
              yield* Deferred.succeed(written, undefined);
              yield* Deferred.await(rollback);
              return yield* Effect.fail("intentional-rollback");
            }),
          )
          .pipe(Effect.result, Effect.forkScoped);
        yield* Deferred.await(written);
        const page = yield* pull.pipe(Effect.forkScoped);
        yield* Deferred.succeed(rollback, undefined);
        assert.equal((yield* Fiber.join(transaction))._tag, "Failure");
        cache = reduceAttentionStream(cache, (yield* Fiber.join(page))[0]!);
        while (cache.status !== "live") cache = reduceAttentionStream(cache, (yield* pull)[0]!);
        assert.equal(HashMap.size(cache.entries), 2);
        const item = [...HashMap.values(cache.entries)].find(
          (entry) => entry.entity?.type === "item",
        );
        assert.equal(
          item?.entity?.type === "item" ? item.entity.value.reasonCode : null,
          "approval_requested",
        );
      }).pipe(Effect.scoped, Effect.provide(Layer.fresh(layer()))),
  );

  it.effect("resets a slow consumer on retention overflow and rejects oversized UTF-8 rows", () =>
    Effect.gen(function* () {
      const f = yield* setup;
      yield* f.thread("thread");
      const slow = yield* f.connect({ pageSize: 1 });
      yield* slow.next();
      yield* f.sql`
        WITH RECURSIVE changes(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM changes WHERE n < 1100)
        INSERT INTO attention_delivery_changes (entity_key,bytes,oversized)
        SELECT 'summary:retention-fixture', 9000, 0 FROM changes
      `;
      const usage = yield* f.sql<{ readonly n: number; readonly bytes: number }>`
        SELECT COUNT(*) AS n, SUM(bytes) AS bytes FROM attention_delivery_changes
      `;
      assert.isAtMost(usage[0]!.n, 1000);
      assert.isAtMost(usage[0]!.bytes, 8 * 1024 * 1024);
      assert.deepEqual(yield* slow.next(), {
        type: "reset-required",
        reason: "replay-unavailable",
      });
      yield* f.activity("thread", "approval.requested", "é".repeat(40000));
      const oversized = yield* f.connect();
      yield* oversized.next();
      assert.deepEqual(yield* oversized.next(), {
        type: "reset-required",
        reason: "message-too-large",
      });
    }).pipe(Effect.scoped, Effect.provide(Layer.fresh(layer()))),
  );

  it.effect(
    "enforces page-token separation, detects journal holes and waits for a new bootstrap during rebuild",
    () =>
      Effect.gen(function* () {
        const f = yield* setup;
        yield* f.thread("thread");
        const stream = yield* f.connect();
        const begin = yield* stream.next();
        assert.equal(begin.type, "begin");
        const page = yield* stream.next();
        assert.equal(page.type, "page");
        if (page.type === "page") {
          const wrongToken = yield* f.connect({
            cursor: AttentionDeliveryCursor.make(page.pageToken),
          });
          assert.equal((yield* wrongToken.next().pipe(Effect.result))._tag, "Failure");
        }
        while ((yield* stream.next()).type !== "sync-complete") {}
        yield* f.activity("thread", "approval.requested", "one");
        yield* f.sql`DELETE FROM attention_delivery_changes WHERE sequence =
        (SELECT MIN(sequence) FROM attention_delivery_changes WHERE sequence > 1)`;
        assert.deepEqual(yield* stream.next(), {
          type: "reset-required",
          reason: "replay-unavailable",
        });
        yield* f.attention.reset;
        const rebuilding = yield* f.connect();
        assert.deepEqual(yield* rebuilding.next(), {
          type: "reset-required",
          reason: "rebuilding",
        });
      }).pipe(Effect.scoped, Effect.provide(Layer.fresh(layer()))),
  );
});
