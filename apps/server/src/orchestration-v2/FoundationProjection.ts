import {
  ApprovalRequestId,
  EventId,
  type ApplicationStoredEvent,
  type OrchestrationV2DomainEvent,
  type OrchestrationThreadAttentionAuditKind,
  type ProviderLifecycleEvidence,
  type RunId,
  type ThreadId,
  TurnId,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";
import * as SqlClient from "effect/sql/SqlClient";
import * as ApplicationEvents from "../persistence/OrchestrationEventStore.ts";
import { toPersistenceSqlError, type ProjectionRepositoryError } from "../persistence/Errors.ts";
import { ProjectionThreadAttentionCurrentRepository as Current } from "../persistence/Services/ProjectionThreadAttentionCurrent.ts";
import { ProjectionThreadAttentionCurrentRepositoryLive } from "../persistence/Layers/ProjectionThreadAttentionCurrent.ts";
import { ProjectionThreadAttentionAuditRepository as Audit } from "../persistence/Services/ProjectionThreadAttentionAudit.ts";
import { ProjectionThreadAttentionAuditRepositoryLive } from "../persistence/Layers/ProjectionThreadAttentionAudit.ts";
import type { AttentionEvidence } from "./AttentionEvidence.ts";

export class FoundationProjection extends Context.Service<
  FoundationProjection,
  {
    readonly project: (
      stored: ApplicationStoredEvent,
    ) => Effect.Effect<void, ProjectionRepositoryError>;
    readonly bootstrap: Effect.Effect<void, ProjectionRepositoryError>;
    readonly rebuild: Effect.Effect<void, ProjectionRepositoryError>;
  }
>()("t3/orchestration-v2/FoundationProjection") {}

export function affectsAttention(stored: ApplicationStoredEvent): boolean {
  if ("event" in stored)
    return [
      "thread.created",
      "thread.deleted",
      "thread.settled",
      "thread.unsettled",
      "runtime-request.updated",
      "provider-turn.updated",
      "provider-session.updated",
      "provider-session.detached",
      "run.created",
      "run.updated",
      "node.updated",
      "provider-thread.updated",
    ].includes(stored.event.type);
  return stored.type === "project.deleted";
}

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const current = yield* Current;
  const audit = yield* Audit;
  const events = yield* ApplicationEvents.OrchestrationEventStore;
  interface NodeRow {
    readonly node_id: string;
    readonly run_id: RunId | null;
    readonly is_root: number;
    readonly provider_thread_id: string | null;
    readonly provider_turn_id: string | null;
  }
  const node = (threadId: ThreadId, nodeId: string) =>
    sql<NodeRow>`
    SELECT * FROM foundation_v2_nodes WHERE thread_id = ${threadId} AND node_id = ${nodeId}
  `.pipe(Effect.map((rows) => rows[0]));
  const provider = (threadId: ThreadId, providerThreadId: string) =>
    sql<{
      readonly provider_key: string;
      readonly provider_session_id: string | null;
    }>`SELECT provider_key, provider_session_id FROM foundation_v2_providers
    WHERE thread_id = ${threadId} AND provider_thread_id = ${providerThreadId}
  `.pipe(Effect.map((rows) => rows[0]));

  // Per-event work shares the enclosing event transaction and its span.
  const apply = Effect.fnUntraced(function* (stored: ApplicationStoredEvent) {
    if (!affectsAttention(stored)) return;
    const cursor = yield* sql<{
      readonly last_sequence: number;
    }>`SELECT last_sequence FROM foundation_projection_cursor WHERE id = 1`;
    if ((cursor[0]?.last_sequence ?? 0) >= stored.sequence) return;
    const source = "event" in stored ? stored.event : null;
    const common = {
      eventId: "event" in stored ? stored.event.id : stored.eventId,
      sequence: stored.sequence,
      occurredAt:
        "event" in stored ? DateTime.formatIso(stored.event.occurredAt) : stored.occurredAt,
    };
    const project = (evidence: AttentionEvidence) => current.project(evidence);
    const lifecycle = (
      event: OrchestrationV2DomainEvent,
      runId: RunId,
      providerKey: string,
      transition: ProviderLifecycleEvidence["transition"],
      failureReason?: ProviderLifecycleEvidence["failureReason"],
    ) =>
      project({
        ...common,
        type: "lifecycle.observed",
        payload: {
          threadId: event.threadId,
          authority:
            event.type === "run.created" || event.type === "run.updated" ? "run" : "provider",
          lifecycle: {
            providerEventId: EventId.make(
              `${event.rawEventId ?? event.id}:${event.type}:${runId}:${transition}`,
            ),
            providerKey,
            turnId: TurnId.make(runId),
            transition,
            ...(failureReason === undefined ? {} : { failureReason }),
          },
        },
      });
    const purge = Effect.fnUntraced(function* (threadId: ThreadId, deleteAudit = true) {
      if (deleteAudit) yield* audit.deleteByThreadId({ threadId });
      yield* sql`DELETE FROM foundation_v2_nodes WHERE thread_id = ${threadId}`;
      yield* sql`DELETE FROM foundation_v2_providers WHERE thread_id = ${threadId}`;
    });
    if (!("event" in stored)) {
      if (stored.type === "project.deleted") {
        const threads = yield* sql<{
          readonly thread_id: ThreadId;
        }>`SELECT thread_id FROM projection_thread_attention_context WHERE project_id = ${stored.payload.projectId}`;
        for (const row of threads) yield* purge(row.thread_id);
        yield* project({ ...common, type: "project.deleted", payload: stored.payload });
      }
    } else if (source !== null) {
      switch (source.type) {
        case "thread.created":
          yield* purge(source.threadId, false);
          yield* project({
            ...common,
            type: "thread.created",
            payload: { threadId: source.threadId, projectId: source.payload.projectId },
          });
          break;
        case "thread.deleted":
          yield* purge(source.threadId);
          yield* project({
            ...common,
            type: "thread.deleted",
            payload: { threadId: source.threadId },
          });
          break;
        case "thread.settled":
        case "thread.unsettled":
          yield* audit.upsert({
            ...common,
            threadId: source.threadId,
            turnId: null,
            requestId: null,
            kind: source.type,
          });
          break;
        case "provider-thread.updated":
          yield* sql`INSERT INTO foundation_v2_providers(thread_id, provider_thread_id, provider_key, provider_session_id)
            VALUES (${source.threadId}, ${source.payload.id}, ${source.payload.providerInstanceId}, ${source.payload.providerSessionId})
            ON CONFLICT(thread_id, provider_thread_id) DO UPDATE SET provider_key = excluded.provider_key, provider_session_id = excluded.provider_session_id`;
          break;
        case "node.updated":
          yield* sql`INSERT INTO foundation_v2_nodes(thread_id, node_id, run_id, is_root, provider_thread_id, provider_turn_id)
            VALUES (${source.threadId}, ${source.payload.id}, ${source.payload.runId}, ${source.payload.kind === "root_turn" ? 1 : 0},
              ${source.payload.providerThreadId}, ${source.payload.providerTurnId})
            ON CONFLICT(thread_id, node_id) DO UPDATE SET run_id = excluded.run_id, is_root = excluded.is_root,
              provider_thread_id = excluded.provider_thread_id, provider_turn_id = COALESCE(excluded.provider_turn_id, foundation_v2_nodes.provider_turn_id)`;
          if (source.payload.kind === "root_turn" && source.payload.status === "rolled_back")
            yield* project({
              ...common,
              type: "thread.reverted",
              payload: { threadId: source.threadId },
            });
          break;
        case "runtime-request.updated": {
          const request = source.payload;
          if (request.kind === "dynamic_tool_call" || request.kind === "auth_refresh") break;
          // Imported/irrecoverable callbacks cannot be answered and are never live requests.
          if (request.responseCapability.type === "not_resumable") break;
          if (request.responseDelivery === "pending") break;
          const owner = yield* node(source.threadId, request.nodeId);
          const runId = owner?.run_id ?? null;
          const sourceTurnId =
            request.providerTurnId ?? owner?.provider_turn_id ?? owner?.run_id ?? null;
          const kind = request.kind === "user_input" ? "user-input" : "approval";
          const action =
            request.responseDelivery === "failed"
              ? "failed"
              : request.status === "pending"
                ? "requested"
                : "resolved";
          const activity =
            action === "failed" ? `provider.${kind}.respond.failed` : `${kind}.${action}`;
          yield* project({
            ...common,
            type: "request.changed",
            payload: {
              threadId: source.threadId,
              activity: {
                kind: activity,
                turnId: runId === null ? null : TurnId.make(runId),
                payload: {
                  requestId: ApprovalRequestId.make(request.id),
                  ...(request.responseCapability.type === "message"
                    ? { responseMode: "message" as const }
                    : {}),
                },
              },
            },
          });
          yield* audit.upsert({
            ...common,
            threadId: source.threadId,
            turnId: sourceTurnId === null ? null : TurnId.make(sourceTurnId),
            requestId: ApprovalRequestId.make(request.id),
            kind: activity as OrchestrationThreadAttentionAuditKind,
          });
          break;
        }
        case "provider-turn.updated": {
          const turn = source.payload;
          const root = yield* node(source.threadId, turn.nodeId);
          const owner = yield* provider(source.threadId, turn.providerThreadId);
          if (root?.is_root !== 1 || root.run_id === null || owner === undefined) break;
          yield* sql`UPDATE foundation_v2_nodes SET provider_turn_id = ${turn.id}, provider_thread_id = ${turn.providerThreadId}
            WHERE thread_id = ${source.threadId} AND node_id = ${turn.nodeId}`;
          // A run can continue across multiple root native turns; their terminals are audit evidence only.
          if (turn.status === "running")
            yield* lifecycle(source, root.run_id, owner.provider_key, "running");
          break;
        }
        case "run.created":
        case "run.updated": {
          const run = source.payload;
          if (run.status === "starting" || run.status === "preparing") {
            yield* project({
              ...common,
              type: "run.starting",
              payload: {
                threadId: source.threadId,
                runId: run.id,
                providerKey: run.providerInstanceId,
              },
            });
          } else if (run.status === "running") {
            yield* lifecycle(source, run.id, run.providerInstanceId, "running");
          } else if (run.status === "rolled_back") {
            yield* project({
              ...common,
              type: "thread.reverted",
              payload: { threadId: source.threadId },
            });
          } else if (["completed", "failed", "interrupted", "cancelled"].includes(run.status)) {
            const terminal = yield* sql`SELECT 1 FROM projection_thread_attention_turns
              WHERE thread_id = ${source.threadId} AND provider_key = ${run.providerInstanceId}
                AND turn_id = ${run.id} AND (
                  phase IN ('completed', 'interrupted') OR (phase = 'failed' AND ${run.status} = 'failed'))`;
            if (terminal.length > 0) break;
            yield* lifecycle(
              source,
              run.id,
              run.providerInstanceId,
              run.status === "failed"
                ? "failed"
                : run.status === "completed"
                  ? "completed"
                  : "interrupted",
              run.status === "failed" ? "runtime_failed" : undefined,
            );
          }
          break;
        }
        case "provider-session.updated":
        case "provider-session.detached": {
          if (
            source.type === "provider-session.updated" &&
            source.payload.status !== "error" &&
            source.payload.status !== "stopped"
          )
            break;
          const sessionId =
            "id" in source.payload ? source.payload.id : source.payload.providerSessionId;
          const roots = yield* sql<{
            readonly run_id: RunId;
            readonly provider_key: string;
          }>`
            SELECT n.run_id, p.provider_key FROM foundation_v2_nodes n
            JOIN foundation_v2_providers p ON p.thread_id = n.thread_id AND p.provider_thread_id = n.provider_thread_id
            JOIN projection_thread_attention_turns t ON t.thread_id = n.thread_id AND t.turn_id = n.run_id AND t.provider_key = p.provider_key
            WHERE n.thread_id = ${source.threadId} AND n.is_root = 1 AND n.run_id IS NOT NULL
              AND p.provider_session_id = ${sessionId} AND t.phase = 'running'
            LIMIT 2`;
          // Multiple active roots are insufficient attribution, not permission to guess.
          if (roots.length === 1)
            yield* lifecycle(source, roots[0]!.run_id, roots[0]!.provider_key, "disconnected");
          break;
        }
      }
    }
    yield* sql`UPDATE foundation_projection_cursor SET last_sequence = ${stored.sequence} WHERE id = 1 AND last_sequence < ${stored.sequence}`;
  });
  const replay = Effect.fn("FoundationProjection.replay")(function* () {
    const rows = yield* sql<{
      readonly last_sequence: number;
    }>`SELECT last_sequence FROM foundation_projection_cursor WHERE id = 1`;
    const throughSequence = yield* events.latestApplicationSequence;
    yield* events
      .readApplicationEvents({ afterSequence: rows[0]?.last_sequence ?? 0, throughSequence })
      .pipe(Stream.runForEach(apply));
    yield* current.finishRebuild;
  });
  const bootstrap = sql
    .withTransaction(replay())
    .pipe(Effect.mapError(toPersistenceSqlError("FoundationProjection.bootstrap")));
  return FoundationProjection.of({
    bootstrap,
    project: Effect.fn("FoundationProjection.project")(
      function* (stored) {
        if (!affectsAttention(stored)) return;
        const state = yield* sql<{
          readonly ready: number;
        }>`SELECT ready FROM attention_delivery_state WHERE id = 1`;
        if (!state[0]?.ready) yield* replay();
        yield* apply(stored);
      },
      Effect.mapError(toPersistenceSqlError("FoundationProjection.project")),
    ),
    rebuild: sql
      .withTransaction(
        Effect.gen(function* () {
          yield* current.reset;
          yield* sql`DELETE FROM foundation_v2_nodes`;
          yield* sql`DELETE FROM foundation_v2_providers`;
          yield* replay();
        }),
      )
      .pipe(Effect.mapError(toPersistenceSqlError("FoundationProjection.rebuild"))),
  });
});
export const layer = Layer.effect(FoundationProjection, make).pipe(
  Layer.provide(
    Layer.mergeAll(
      ProjectionThreadAttentionCurrentRepositoryLive,
      ProjectionThreadAttentionAuditRepositoryLive,
      ApplicationEvents.layer,
    ),
  ),
);
