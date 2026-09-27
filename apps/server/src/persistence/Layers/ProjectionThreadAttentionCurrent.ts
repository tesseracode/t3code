// @effect-diagnostics nodeBuiltinImport:off
import * as NodeCrypto from "node:crypto";
import {
  ApprovalRequestId,
  EventId,
  type OrchestrationEvent,
  ProjectId,
  RequestAttentionKind,
  RequestAttentionItem,
  ThreadId,
  TurnId,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import * as SqlSchema from "effect/unstable/sql/SqlSchema";
import { toPersistenceDecodeError, toPersistenceSqlError } from "../Errors.ts";
import {
  CURRENT_ATTENTION_PROJECTOR,
  ListCurrentAttentionInput,
  ProjectionThreadAttentionCurrentRepository,
} from "../Services/ProjectionThreadAttentionCurrent.ts";

const activityTransitions = {
  "approval.requested": { kind: "approval", action: "open" },
  "approval.resolved": { kind: "approval", action: "resolve" },
  "provider.approval.respond.failed": { kind: "approval", action: "fail" },
  "user-input.requested": { kind: "user_input", action: "open" },
  "user-input.resolved": { kind: "user_input", action: "resolve" },
  "provider.user-input.respond.failed": { kind: "user_input", action: "fail" },
} as const;
const ActivityKind = Schema.Literals([
  "approval.requested",
  "approval.resolved",
  "provider.approval.respond.failed",
  "user-input.requested",
  "user-input.resolved",
  "provider.user-input.respond.failed",
]);
const isActivityKind = Schema.is(ActivityKind);
const requestIdentity = Schema.decodeUnknownOption(
  Schema.Struct({
    requestId: Schema.optional(ApprovalRequestId),
  }),
);
const encodeIdentity = Schema.encodeEffect(
  Schema.fromJsonString(
    Schema.Tuple([EventId, RequestAttentionKind, ApprovalRequestId, Schema.NullOr(TurnId)]),
  ),
);

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const context = SqlSchema.findOneOption({
    Request: ThreadId,
    Result: Schema.Struct({
      projectId: ProjectId,
      incarnationEventId: EventId,
      isDeleted: Schema.Literals([0, 1]),
    }),
    execute: (threadId) => sql`
      SELECT project_id AS "projectId", incarnation_event_id AS "incarnationEventId",
        is_deleted AS "isDeleted"
      FROM projection_thread_attention_context WHERE thread_id = ${threadId}
    `,
  });
  const list = SqlSchema.findAll({
    Request: ListCurrentAttentionInput,
    Result: RequestAttentionItem,
    execute: ({ threadId, limit, afterAttentionId }) => sql`
      SELECT attention_id AS "attentionId", project_id AS "projectId", thread_id AS "threadId",
        turn_id AS "turnId", request_id AS "requestId", kind, status, reason_code AS "reasonCode",
        revision, source_event_id AS "sourceEventId", source_sequence AS "sourceSequence",
        opened_at AS "openedAt", updated_at AS "updatedAt", resolved_at AS "resolvedAt"
      FROM projection_thread_attention_current
      WHERE thread_id = ${threadId} AND attention_id > ${afterAttentionId ?? ""}
      ORDER BY attention_id ASC LIMIT ${limit}
    `,
  });
  const project = Effect.fn("ProjectionThreadAttentionCurrent.project")(function* (
    event: OrchestrationEvent,
  ) {
    if (event.type === "thread.activity-appended") {
      if (event.metadata.historyImport === true || !isActivityKind(event.payload.activity.kind))
        return;
    } else if (
      !["thread.created", "thread.deleted", "thread.reverted", "project.deleted"].includes(
        event.type,
      )
    ) {
      return;
    }
    const cursor = yield* sql<{ readonly sequence: number }>`
      SELECT last_applied_sequence AS sequence FROM projection_state
      WHERE projector = ${CURRENT_ATTENTION_PROJECTOR}
    `;
    if ((cursor[0]?.sequence ?? 0) >= event.sequence) return;
    switch (event.type) {
      case "thread.created":
        yield* sql`DELETE FROM projection_thread_attention_current WHERE thread_id = ${event.payload.threadId}`;
        yield* sql`
          INSERT INTO projection_thread_attention_context (thread_id, project_id, incarnation_event_id, is_deleted)
          VALUES (${event.payload.threadId}, ${event.payload.projectId}, ${event.eventId}, 0)
          ON CONFLICT (thread_id) DO UPDATE SET project_id = excluded.project_id,
            incarnation_event_id = excluded.incarnation_event_id, is_deleted = 0
        `;
        return;
      case "thread.deleted":
        yield* sql`DELETE FROM projection_thread_attention_current WHERE thread_id = ${event.payload.threadId}`;
        yield* sql`UPDATE projection_thread_attention_context SET is_deleted = 1 WHERE thread_id = ${event.payload.threadId}`;
        return;
      case "project.deleted":
        yield* sql`DELETE FROM projection_thread_attention_current WHERE project_id = ${event.payload.projectId}`;
        yield* sql`UPDATE projection_thread_attention_context SET is_deleted = 1 WHERE project_id = ${event.payload.projectId}`;
        return;
      case "thread.reverted":
        yield* sql`
          UPDATE projection_thread_attention_current SET status = 'resolved', reason_code = 'thread_reverted',
            revision = revision + 1, source_event_id = ${event.eventId}, source_sequence = ${event.sequence},
            updated_at = ${event.occurredAt}, resolved_at = ${event.occurredAt}
          WHERE thread_id = ${event.payload.threadId} AND status = 'open'
        `;
        return;
      case "thread.activity-appended": {
        if (!isActivityKind(event.payload.activity.kind)) return;
        const transition = activityTransitions[event.payload.activity.kind];
        const decoded = requestIdentity(event.payload.activity.payload);
        const requestId =
          (Option.isSome(decoded) ? decoded.value.requestId : undefined) ??
          event.metadata.requestId;
        if (requestId === undefined) {
          yield* Effect.logWarning(
            "Ignored current attention event without a valid request identity",
            {
              eventId: event.eventId,
              sequence: event.sequence,
              kind: event.payload.activity.kind,
            },
          );
          return;
        }
        const thread = yield* context(event.payload.threadId);
        if (Option.isNone(thread)) {
          yield* Effect.logWarning("Ignored current attention event without a thread incarnation", {
            eventId: event.eventId,
            sequence: event.sequence,
          });
          return;
        }
        if (thread.value.isDeleted === 1) return;
        const turnId = event.payload.activity.turnId;
        if (transition.action === "open") {
          const identity = yield* encodeIdentity([
            thread.value.incarnationEventId,
            transition.kind,
            requestId,
            turnId,
          ]);
          const attentionId = NodeCrypto.createHash("sha256").update(identity).digest("hex");
          yield* sql`
            INSERT INTO projection_thread_attention_current
              (attention_id, project_id, thread_id, turn_id, request_id, kind, status, reason_code,
               revision, source_event_id, source_sequence, opened_at, updated_at, resolved_at)
            VALUES (${attentionId}, ${thread.value.projectId}, ${event.payload.threadId}, ${turnId},
              ${requestId}, ${transition.kind}, 'open',
              ${transition.kind === "approval" ? "approval_requested" : "user_input_requested"},
              1, ${event.eventId}, ${event.sequence}, ${event.occurredAt}, ${event.occurredAt}, NULL)
            ON CONFLICT (attention_id) DO NOTHING
          `;
          return;
        }
        const candidates = yield* sql<{
          readonly attention_id: string;
          readonly reason_code: string;
          readonly status: string;
        }>`
          SELECT attention_id, reason_code, status FROM projection_thread_attention_current
          WHERE thread_id = ${event.payload.threadId} AND kind = ${transition.kind}
            AND request_id = ${requestId}
            AND (${turnId} IS NULL OR turn_id = ${turnId})
          LIMIT 2
        `;
        if (candidates.length > 1) {
          yield* Effect.logWarning(
            "Ignored ambiguous current attention reply without matching turn identity",
            {
              eventId: event.eventId,
              sequence: event.sequence,
            },
          );
          return;
        }
        const candidate = candidates[0];
        if (
          !candidate ||
          candidate.status !== "open" ||
          (transition.action === "fail" && candidate.reason_code === "response_failed")
        )
          return;
        const resolved = transition.action === "resolve";
        yield* sql`
          UPDATE projection_thread_attention_current SET status = ${resolved ? "resolved" : "open"},
            reason_code = ${resolved ? "request_resolved" : "response_failed"}, revision = revision + 1,
            source_event_id = ${event.eventId}, source_sequence = ${event.sequence},
            updated_at = ${event.occurredAt}, resolved_at = ${resolved ? event.occurredAt : null}
          WHERE attention_id = ${candidate.attention_id}
        `;
        return;
      }
    }
  });
  const mapError = (operation: string) => (cause: unknown) =>
    Schema.isSchemaError(cause)
      ? toPersistenceDecodeError(operation)(cause)
      : toPersistenceSqlError(operation)(cause);
  return ProjectionThreadAttentionCurrentRepository.of({
    project: (event) => project(event).pipe(Effect.mapError(mapError("CurrentAttention.project"))),
    listByThreadId: (input) => list(input).pipe(Effect.mapError(mapError("CurrentAttention.list"))),
    reset: sql
      .withTransaction(
        Effect.gen(function* () {
          yield* sql`DELETE FROM projection_thread_attention_current`;
          yield* sql`DELETE FROM projection_thread_attention_context`;
          yield* sql`DELETE FROM projection_state WHERE projector = ${CURRENT_ATTENTION_PROJECTOR}`;
        }),
      )
      .pipe(Effect.mapError(mapError("CurrentAttention.reset"))),
  });
});

export const ProjectionThreadAttentionCurrentRepositoryLive = Layer.effect(
  ProjectionThreadAttentionCurrentRepository,
  make,
);
