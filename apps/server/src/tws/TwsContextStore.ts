import {
  EnvironmentId,
  ProjectId,
  TwsContextError,
  TwsIntegrationState,
  TwsTopologyEntry,
  type ThreadId,
  type TwsTopologyQuery,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import { toPersistenceDecodeError } from "../persistence/Errors.ts";
import { TwsRecord, TwsStoredContext, TwsThreadInput, twsRecordId } from "./TwsContextModel.ts";

const decodeStates = Schema.decodeUnknownEffect(
  Schema.Array(Schema.Struct({ data: Schema.fromJsonString(TwsIntegrationState) })),
);
const decodeRecords = Schema.decodeUnknownEffect(
  Schema.Array(Schema.Struct({ data: Schema.fromJsonString(TwsRecord) })),
);
const decodeContexts = Schema.decodeUnknownEffect(
  Schema.Array(Schema.Struct({ data: Schema.fromJsonString(TwsStoredContext) })),
);
const decodeThreads = Schema.decodeUnknownEffect(Schema.Array(TwsThreadInput));
const decodeProjects = Schema.decodeUnknownEffect(
  Schema.Array(Schema.Struct({ projectId: ProjectId, workspaceRoot: Schema.String })),
);
const decodeGeneration = Schema.decodeUnknownEffect(
  Schema.Array(Schema.Struct({ generation: Schema.Number })),
);
const encodeState = Schema.encodeEffect(Schema.fromJsonString(TwsIntegrationState));
const encodeRecord = Schema.encodeEffect(Schema.fromJsonString(TwsRecord));
const encodeContext = Schema.encodeEffect(Schema.fromJsonString(TwsStoredContext));
const encodeSummary = Schema.encodeEffect(Schema.fromJsonString(TwsTopologyEntry));
const decodeSummaries = Schema.decodeUnknownEffect(
  Schema.Array(Schema.Struct({ data: Schema.fromJsonString(TwsTopologyEntry) })),
);

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const readState = Effect.fn("TwsContextStore.readState")(function* (
    environmentId: EnvironmentId,
  ) {
    const rows =
      yield* sql`SELECT data_json AS data FROM tws_context_observations WHERE environment_id = ${environmentId}`;
    return (
      (yield* decodeStates(rows).pipe(
        Effect.mapError(toPersistenceDecodeError("TwsContextStore.readState")),
      ))[0]?.data ?? null
    );
  });
  const records = Effect.fn("TwsContextStore.records")(function* (environmentId: EnvironmentId) {
    const rows =
      yield* sql`SELECT data_json AS data FROM tws_context_topology WHERE environment_id = ${environmentId} ORDER BY binding_id`;
    return (yield* decodeRecords(rows).pipe(
      Effect.mapError(toPersistenceDecodeError("TwsContextStore.records")),
    )).map((row) => row.data);
  });
  const contexts = Effect.fn("TwsContextStore.contexts")(function* (
    environmentId: EnvironmentId,
    ids?: ReadonlyArray<ThreadId>,
  ) {
    const rows =
      yield* sql`SELECT data_json AS data FROM tws_thread_contexts WHERE environment_id = ${environmentId}
      AND ${ids === undefined ? sql`1 = 1` : sql.in("thread_id", ids)}`;
    return (yield* decodeContexts(rows).pipe(
      Effect.mapError(toPersistenceDecodeError("TwsContextStore.contexts")),
    )).map((row) => row.data);
  });
  const record = Effect.fn("TwsContextStore.record")(function* (
    environmentId: EnvironmentId,
    bindingId: string,
  ) {
    const rows = yield* sql`SELECT data_json AS data FROM tws_context_topology
      WHERE environment_id = ${environmentId} AND binding_id = ${bindingId}`;
    return (
      (yield* decodeRecords(rows).pipe(
        Effect.mapError(toPersistenceDecodeError("TwsContextStore.record")),
      ))[0]?.data ?? null
    );
  });
  const page = Effect.fn("TwsContextStore.page")(function* (
    environmentId: EnvironmentId,
    query: TwsTopologyQuery,
  ) {
    const rows =
      yield* sql`SELECT summary_json AS data FROM tws_context_topology WHERE environment_id = ${environmentId}
      AND ${query.workspaceBindingId ? sql`workspace_binding_id = ${query.workspaceBindingId}` : sql`1 = 1`}
      AND ${query.featureBindingId ? sql`feature_binding_id = ${query.featureBindingId}` : sql`1 = 1`}
      AND ${query.after ? sql`binding_id > ${query.after}` : sql`1 = 1`}
      ORDER BY binding_id LIMIT ${(query.limit ?? 50) + 1}`;
    return (yield* decodeSummaries(rows).pipe(
      Effect.mapError(toPersistenceDecodeError("TwsContextStore.page")),
    )).map((row) => row.data);
  });
  const threads = Effect.fn("TwsContextStore.threads")(function* (ids?: ReadonlyArray<ThreadId>) {
    const rows = yield* sql`
      SELECT t.thread_id AS threadId, t.project_id AS projectId, p.workspace_root AS workspaceRoot,
        t.worktree_path AS worktreePath, t.branch,
        CASE WHEN te.event_id IS NULL OR pe.event_id IS NULL THEN NULL
          ELSE json_array(te.event_id, pe.event_id) END AS incarnation
      FROM projection_threads t JOIN projection_projects p ON p.project_id = t.project_id
      LEFT JOIN orchestration_events te ON te.sequence = (
        SELECT sequence FROM orchestration_events WHERE aggregate_kind = 'thread' AND stream_id = t.thread_id
          AND event_type = 'thread.created' ORDER BY sequence DESC LIMIT 1)
      LEFT JOIN orchestration_events pe ON pe.sequence = (
        SELECT sequence FROM orchestration_events WHERE aggregate_kind = 'project' AND stream_id = p.project_id
          AND event_type = 'project.created' ORDER BY sequence DESC LIMIT 1)
      WHERE t.deleted_at IS NULL AND p.deleted_at IS NULL
        AND ${ids === undefined ? sql`1 = 1` : sql.in("t.thread_id", ids)}
      ORDER BY t.thread_id
    `;
    return yield* decodeThreads(rows).pipe(
      Effect.mapError(toPersistenceDecodeError("TwsContextStore.threads")),
    );
  });
  const projects = Effect.fn("TwsContextStore.projects")(function* () {
    const rows = yield* sql`SELECT project_id AS projectId, workspace_root AS workspaceRoot
      FROM projection_projects WHERE deleted_at IS NULL ORDER BY project_id`;
    return yield* decodeProjects(rows).pipe(
      Effect.mapError(toPersistenceDecodeError("TwsContextStore.projects")),
    );
  });
  const begin = Effect.fn("TwsContextStore.begin")(function* (state: TwsIntegrationState) {
    return yield* sql.withTransaction(
      Effect.gen(function* () {
        const rows =
          yield* sql`INSERT INTO tws_context_observations(environment_id, generation, data_json)
        VALUES (${state.environmentId}, 1, ${yield* encodeState(state)})
        ON CONFLICT(environment_id) DO UPDATE SET generation = generation + 1
        RETURNING generation`;
        const generation = (yield* decodeGeneration(rows))[0]?.generation;
        if (generation === undefined)
          return yield* new TwsContextError({
            reason: "unavailable",
            message: "TWS observation generation was not allocated.",
          });
        const next = { ...state, generation };
        yield* sql`UPDATE tws_context_observations SET data_json = ${yield* encodeState(next)} WHERE environment_id = ${state.environmentId}`;
        return next;
      }),
    );
  });
  const guard = Effect.fn("TwsContextStore.guard")(function* (
    environmentId: EnvironmentId,
    generation: number,
  ) {
    const current = yield* readState(environmentId);
    if (current?.generation !== generation)
      return yield* new TwsContextError({
        reason: "conflict",
        message: "A newer TWS observation superseded this refresh.",
      });
  });
  const writeRecord = Effect.fn(function* (
    environmentId: EnvironmentId,
    record: TwsRecord,
    summary: TwsTopologyEntry,
  ) {
    yield* sql`INSERT INTO tws_context_topology(environment_id, binding_id, workspace_binding_id, feature_binding_id, summary_json, data_json)
      VALUES (${environmentId}, ${twsRecordId(record)}, ${record.workspaceBindingId}, ${summary.featureBindingId},
        ${yield* encodeSummary(summary)}, ${yield* encodeRecord(record)})
      ON CONFLICT(environment_id, binding_id) DO UPDATE SET workspace_binding_id = excluded.workspace_binding_id,
        feature_binding_id = excluded.feature_binding_id, summary_json = excluded.summary_json, data_json = excluded.data_json`;
  });
  const writeContext = Effect.fn(function* (
    environmentId: EnvironmentId,
    context: TwsStoredContext,
  ) {
    yield* sql`INSERT INTO tws_thread_contexts(environment_id, thread_id, data_json)
      VALUES (${environmentId}, ${context.context.threadId}, ${yield* encodeContext(context)})
      ON CONFLICT(environment_id, thread_id) DO UPDATE SET data_json = excluded.data_json`;
  });
  const finish = Effect.fn(function* (state: TwsIntegrationState) {
    yield* sql`UPDATE tws_context_observations SET data_json = ${yield* encodeState(state)}
      WHERE environment_id = ${state.environmentId} AND generation = ${state.generation}`;
  });
  const removeDeleted = (environmentId: EnvironmentId) =>
    sql`DELETE FROM tws_thread_contexts WHERE environment_id = ${environmentId} AND thread_id NOT IN
      (SELECT t.thread_id FROM projection_threads t JOIN projection_projects p ON p.project_id=t.project_id
       WHERE t.deleted_at IS NULL AND p.deleted_at IS NULL)`.pipe(Effect.asVoid);
  return {
    readState,
    records,
    record,
    page,
    contexts,
    threads,
    projects,
    begin,
    guard,
    writeRecord,
    writeContext,
    finish,
    removeDeleted,
    transaction: sql.withTransaction,
  };
});
export class TwsContextStore extends Context.Service<
  TwsContextStore,
  Effect.Success<typeof make>
>()("t3/tws/TwsContextStore") {}
export const TwsContextStoreLive = Layer.effect(TwsContextStore, make);
