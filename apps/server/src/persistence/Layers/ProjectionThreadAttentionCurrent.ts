// @effect-diagnostics nodeBuiltinImport:off
import * as NodeCrypto from "node:crypto";
import { compareDateTimeStrings } from "@t3tools/shared/dateTime";
import {
  ApprovalRequestId,
  ATTENTION_SUMMARY_COUNT_LIMIT,
  EventId,
  type OrchestrationEvent,
  ProjectId,
  RequestAttentionKind,
  ThreadAttentionItem,
  ThreadAwarenessSummary,
  type ThreadAwarenessPhase,
  ThreadId,
  TurnId,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as PubSub from "effect/PubSub";
import * as Stream from "effect/Stream";
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
/** Keep transport wakeups aligned with the projector; ordinary content deltas do no attention work. */
export function affectsCurrentAttention(event: OrchestrationEvent): boolean {
  if (event.metadata.historyImport === true && event.type !== "thread.created") return false;
  if (event.type === "thread.activity-appended") return isActivityKind(event.payload.activity.kind);
  if (event.type === "thread.session-set") return event.payload.lifecycle !== undefined;
  return [
    "thread.created",
    "thread.deleted",
    "project.deleted",
    "thread.reverted",
    "thread.turn-start-requested",
    "thread.session-stop-requested",
    "thread.turn-interrupt-requested",
  ].includes(event.type);
}
const requestIdentity = Schema.decodeUnknownOption(
  Schema.Struct({
    requestId: Schema.optional(ApprovalRequestId),
    responseMode: Schema.optional(Schema.Unknown),
  }),
);
const encodeIdentity = Schema.encodeEffect(
  Schema.fromJsonString(
    Schema.Tuple([EventId, RequestAttentionKind, ApprovalRequestId, Schema.NullOr(TurnId)]),
  ),
);
const encodeLifecycleIdentity = Schema.encodeEffect(
  Schema.fromJsonString(Schema.Array(Schema.String)),
);

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const resets = yield* PubSub.sliding<void>(1);
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
    Result: ThreadAttentionItem,
    execute: ({ threadId, limit, afterAttentionId }) => sql`
      SELECT attention_id AS "attentionId", project_id AS "projectId", thread_id AS "threadId",
        turn_id AS "turnId", request_id AS "requestId", kind, status, reason_code AS "reasonCode",
        revision, source_event_id AS "sourceEventId", source_sequence AS "sourceSequence",
        opened_at AS "openedAt", updated_at AS "updatedAt", resolved_at AS "resolvedAt", title
      FROM (
        SELECT attention_id, project_id, thread_id, turn_id, request_id, kind, status,
          reason_code, revision, source_event_id, source_sequence, opened_at, updated_at, resolved_at,
          NULL AS title FROM projection_thread_attention_current
        UNION ALL
        SELECT attention_id, project_id, thread_id, turn_id, NULL AS request_id, kind, status,
          reason_code, revision, source_event_id, source_sequence, opened_at, updated_at, resolved_at,
          CASE kind WHEN 'failure' THEN 'Agent failed' ELSE 'Provider disconnected' END AS title
        FROM projection_thread_attention_lifecycle
      )
      WHERE thread_id = ${threadId} AND attention_id > ${afterAttentionId ?? ""}
      ORDER BY attention_id ASC LIMIT ${limit}
    `,
  });
  const readSummary = SqlSchema.findOneOption({
    Request: ThreadId,
    Result: Schema.Struct({
      ...ThreadAwarenessSummary.fields,
      countsOverflowed: Schema.Literals([0, 1]),
    }),
    execute: (threadId) => sql`
      SELECT thread_id AS "threadId", project_id AS "projectId", reported_turn_id AS "turnId", phase,
        approval_count AS "approvalCount", input_count AS "inputCount", failure_count AS "failureCount",
        disconnect_count AS "disconnectCount", counts_overflowed AS "countsOverflowed",
        revision, source_event_id AS "sourceEventId", source_sequence AS "sourceSequence", updated_at AS "updatedAt"
      FROM projection_thread_awareness WHERE thread_id = ${threadId}
    `,
  });
  const applyRequests = Effect.fn("ProjectionThreadAttentionCurrent.applyRequests")(function* (
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
        const resolvesWithTurn =
          transition.kind !== "user_input" ||
          Option.isNone(decoded) ||
          decoded.value.responseMode !== "message";
        if (transition.action === "open") {
          if (turnId !== null && resolvesWithTurn) {
            const terminal = yield* sql`
              SELECT 1 FROM projection_thread_attention_turns
              WHERE thread_id = ${event.payload.threadId} AND turn_id = ${turnId}
                AND phase IN ('completed', 'interrupted', 'failed') LIMIT 1
            `;
            if (terminal.length > 0) return;
          }
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
               revision, source_event_id, source_sequence, opened_at, updated_at, resolved_at, resolves_with_turn)
            VALUES (${attentionId}, ${thread.value.projectId}, ${event.payload.threadId}, ${turnId},
              ${requestId}, ${transition.kind}, 'open',
              ${transition.kind === "approval" ? "approval_requested" : "user_input_requested"},
              1, ${event.eventId}, ${event.sequence}, ${event.occurredAt}, ${event.occurredAt}, NULL, ${resolvesWithTurn ? 1 : 0})
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

  interface AwarenessState {
    readonly thread_id: string;
    readonly turn_id: string | null;
    readonly provider_key: string | null;
    readonly base_phase: ThreadAwarenessPhase | null;
    readonly pending_start: number;
    readonly stop_requested: number;
    readonly lifecycle_observed_at: string | null;
  }
  const refreshSummary = Effect.fn("CurrentAttention.refreshSummary")(function* (
    threadId: ThreadId,
    event: OrchestrationEvent,
  ) {
    const states =
      yield* sql<AwarenessState>`SELECT * FROM projection_thread_awareness WHERE thread_id = ${threadId}`;
    const state = states[0];
    if (!state) return;
    const counts = yield* sql<{ readonly kind: string; readonly count: number }>`
      SELECT 'approval' AS kind, COUNT(*) AS count FROM (
        SELECT 1 FROM projection_thread_attention_current
        WHERE thread_id = ${threadId} AND status = 'open' AND kind = 'approval'
        LIMIT ${ATTENTION_SUMMARY_COUNT_LIMIT + 1})
      UNION ALL
      SELECT 'user_input', COUNT(*) FROM (
        SELECT 1 FROM projection_thread_attention_current
        WHERE thread_id = ${threadId} AND status = 'open' AND kind = 'user_input'
        LIMIT ${ATTENTION_SUMMARY_COUNT_LIMIT + 1})
      UNION ALL
      SELECT 'failure', COUNT(*) FROM (
        SELECT 1 FROM projection_thread_attention_lifecycle
        WHERE thread_id = ${threadId} AND status = 'open' AND kind = 'failure'
        LIMIT ${ATTENTION_SUMMARY_COUNT_LIMIT + 1})
      UNION ALL
      SELECT 'disconnect', COUNT(*) FROM (
        SELECT 1 FROM projection_thread_attention_lifecycle
        WHERE thread_id = ${threadId} AND status = 'open' AND kind = 'disconnect'
        LIMIT ${ATTENTION_SUMMARY_COUNT_LIMIT + 1})
    `;
    const count = (kind: string) =>
      Math.min(ATTENTION_SUMMARY_COUNT_LIMIT, counts.find((row) => row.kind === kind)?.count ?? 0);
    const approvals = count("approval"),
      inputs = count("user_input");
    const failures = count("failure"),
      disconnects = count("disconnect");
    const overflow = counts.some((row) => row.count > ATTENTION_SUMMARY_COUNT_LIMIT) ? 1 : 0;
    const phase =
      state.base_phase === "failed" || state.base_phase === "stale"
        ? state.base_phase
        : approvals > 0
          ? "waiting_for_approval"
          : inputs > 0
            ? "waiting_for_input"
            : state.pending_start
              ? "starting"
              : state.base_phase;
    yield* sql`
      UPDATE projection_thread_awareness SET phase = ${phase}, approval_count = ${approvals},
        reported_turn_id = ${state.turn_id},
        input_count = ${inputs}, failure_count = ${failures}, disconnect_count = ${disconnects},
        counts_overflowed = ${overflow}, revision = revision + 1, source_event_id = ${event.eventId},
        source_sequence = ${event.sequence}, updated_at = ${event.occurredAt}
      WHERE thread_id = ${threadId} AND (
        phase IS NOT ${phase} OR reported_turn_id IS NOT ${state.turn_id}
        OR approval_count != ${approvals} OR input_count != ${inputs}
        OR failure_count != ${failures} OR disconnect_count != ${disconnects} OR counts_overflowed != ${overflow}
      )
    `;
  });

  const applyLifecycle = Effect.fn("CurrentAttention.applyLifecycle")(function* (
    event: Extract<OrchestrationEvent, { type: "thread.session-set" }>,
  ) {
    const evidence = event.payload.lifecycle;
    if (!evidence) return;
    const threadId = event.payload.threadId;
    const states =
      yield* sql<AwarenessState>`SELECT * FROM projection_thread_awareness WHERE thread_id = ${threadId}`;
    const state = states[0];
    if (!state) return;
    const owner = yield* context(threadId);
    if (Option.isNone(owner) || owner.value.isDeleted) return;
    const observed = yield* sql`
      INSERT INTO projection_thread_attention_observations (thread_id, provider_key, provider_event_id)
      VALUES (${threadId}, ${evidence.providerKey}, ${evidence.providerEventId})
      ON CONFLICT DO NOTHING RETURNING provider_event_id
    `;
    if (observed.length === 0) return;
    if (
      state.lifecycle_observed_at !== null &&
      compareDateTimeStrings(event.occurredAt, state.lifecycle_observed_at) < 0
    )
      return;
    if (evidence.transition === "starting") {
      if (state.base_phase === "completed" && !state.pending_start) return;
      if (
        evidence.turnId !== null &&
        state.turn_id !== null &&
        (evidence.turnId !== state.turn_id || evidence.providerKey !== state.provider_key)
      )
        return;
      yield* sql`UPDATE projection_thread_awareness SET pending_start = 1, lifecycle_observed_at = ${event.occurredAt}
        WHERE thread_id = ${threadId}`;
      return;
    }
    if (evidence.transition === "ready") return;
    const turnId =
      evidence.turnId ??
      (state.stop_requested && state.provider_key === evidence.providerKey ? state.turn_id : null);
    // A provider state without an attributable turn is not proof about another turn.
    if (turnId === null) return;
    const turns = yield* sql<{ readonly phase: string; readonly source_sequence: number }>`
      SELECT phase, source_sequence FROM projection_thread_attention_turns
      WHERE thread_id = ${threadId} AND provider_key = ${evidence.providerKey} AND turn_id = ${turnId}
    `;
    const turn = turns[0];
    if (turn?.phase === "completed" || turn?.phase === "interrupted") return;
    const current = state.turn_id === turnId && state.provider_key === evidence.providerKey;
    if (
      !current &&
      state.turn_id !== null &&
      (evidence.transition !== "running" || (turn !== undefined && !state.pending_start))
    )
      return;
    if (
      evidence.transition === "running" &&
      !current &&
      state.base_phase === "running" &&
      !state.pending_start
    )
      return;
    let transition = evidence.transition;
    if (transition === "disconnected") {
      if (state.stop_requested && current) transition = "interrupted";
      else if (!current || turn?.phase !== "running") return;
    }
    const phase = transition === "disconnected" ? "stale" : transition;
    yield* sql`
      INSERT INTO projection_thread_attention_turns (thread_id, provider_key, turn_id, phase, source_sequence)
      VALUES (${threadId}, ${evidence.providerKey}, ${turnId}, ${phase}, ${event.sequence})
      ON CONFLICT (thread_id, provider_key, turn_id) DO UPDATE SET phase = excluded.phase,
        source_sequence = excluded.source_sequence
    `;
    if (transition === "running" || transition === "completed") {
      yield* sql`
        UPDATE projection_thread_attention_lifecycle SET status = 'resolved',
          reason_code = ${transition === "running" ? "provider_recovered" : "turn_completed"},
          revision = revision + 1, source_event_id = ${event.eventId}, source_sequence = ${event.sequence},
          updated_at = ${event.occurredAt}, resolved_at = ${event.occurredAt}
        WHERE thread_id = ${threadId} AND provider_key = ${evidence.providerKey}
          AND turn_id = ${turnId} AND status = 'open'
      `;
    }
    if (transition === "completed" || transition === "failed" || transition === "interrupted") {
      yield* sql`
        UPDATE projection_thread_attention_current SET status = 'resolved', reason_code = 'request_resolved',
          revision = revision + 1, source_event_id = ${event.eventId}, source_sequence = ${event.sequence},
          updated_at = ${event.occurredAt}, resolved_at = ${event.occurredAt}
        WHERE thread_id = ${threadId} AND turn_id = ${turnId} AND status = 'open' AND resolves_with_turn = 1
      `;
      if (transition === "interrupted") {
        yield* sql`
          UPDATE projection_thread_attention_lifecycle SET status = 'resolved', reason_code = 'turn_interrupted',
            revision = revision + 1, source_event_id = ${event.eventId}, source_sequence = ${event.sequence},
            updated_at = ${event.occurredAt}, resolved_at = ${event.occurredAt}
          WHERE thread_id = ${threadId} AND provider_key = ${evidence.providerKey} AND turn_id = ${turnId}
            AND kind = 'disconnect' AND status = 'open'
        `;
      }
    }
    if (transition === "failed" || transition === "disconnected") {
      const kind = transition === "failed" ? "failure" : "disconnect";
      const reason =
        kind === "failure"
          ? (evidence.failureReason ?? "provider_failed")
          : "provider_disconnected";
      const existing = yield* sql<{ readonly attention_id: string; readonly reason_code: string }>`
        SELECT attention_id, reason_code FROM projection_thread_attention_lifecycle
        WHERE thread_id = ${threadId} AND provider_key = ${evidence.providerKey} AND turn_id = ${turnId}
          AND kind = ${kind} AND status = 'open'
      `;
      if (existing[0]) {
        if (existing[0].reason_code !== reason)
          yield* sql`
          UPDATE projection_thread_attention_lifecycle SET reason_code = ${reason}, revision = revision + 1,
            source_event_id = ${event.eventId}, source_sequence = ${event.sequence}, updated_at = ${event.occurredAt}
          WHERE attention_id = ${existing[0].attention_id}
        `;
      } else {
        const identity = yield* encodeLifecycleIdentity([
          owner.value.incarnationEventId,
          kind,
          evidence.providerKey,
          turnId,
          event.eventId,
        ]);
        const id = NodeCrypto.createHash("sha256").update(identity).digest("hex");
        yield* sql`
          INSERT INTO projection_thread_attention_lifecycle
            (attention_id, project_id, thread_id, turn_id, provider_key, kind, status, reason_code,
             revision, source_event_id, source_sequence, opened_at, updated_at, resolved_at)
          VALUES (${id}, ${owner.value.projectId}, ${threadId}, ${turnId}, ${evidence.providerKey}, ${kind},
            'open', ${reason}, 1, ${event.eventId}, ${event.sequence}, ${event.occurredAt}, ${event.occurredAt}, NULL)
        `;
      }
    }
    // Old failures stay independently visible when a different turn starts.
    yield* sql`
      UPDATE projection_thread_awareness SET turn_id = ${turnId}, provider_key = ${evidence.providerKey},
        lifecycle_observed_at = ${event.occurredAt},
        base_phase = ${transition === "interrupted" ? null : phase},
        pending_start = ${transition !== "completed" ? 0 : state.pending_start},
        stop_requested = ${transition === "interrupted" || transition === "completed" ? 0 : state.stop_requested}
      WHERE thread_id = ${threadId}
    `;
  });

  const project = Effect.fn("ProjectionThreadAttentionCurrent.project")(function* (
    event: OrchestrationEvent,
  ) {
    if (!affectsCurrentAttention(event)) return;
    const cursor = yield* sql<{ readonly sequence: number }>`
      SELECT last_applied_sequence AS sequence FROM projection_state WHERE projector = ${CURRENT_ATTENTION_PROJECTOR}
    `;
    if ((cursor[0]?.sequence ?? 0) >= event.sequence) return;
    yield* applyRequests(event);
    switch (event.type) {
      case "thread.created":
        yield* sql`DELETE FROM projection_thread_attention_observations WHERE thread_id = ${event.payload.threadId}`;
        yield* sql`DELETE FROM projection_thread_attention_lifecycle WHERE thread_id = ${event.payload.threadId}`;
        yield* sql`DELETE FROM projection_thread_attention_turns WHERE thread_id = ${event.payload.threadId}`;
        yield* sql`DELETE FROM projection_thread_awareness WHERE thread_id = ${event.payload.threadId}`;
        yield* sql`INSERT INTO projection_thread_awareness
          (thread_id, project_id, turn_id, provider_key, base_phase, pending_start, stop_requested, phase,
           approval_count, input_count, failure_count, disconnect_count, counts_overflowed,
           revision, source_event_id, source_sequence, updated_at)
          VALUES (${event.payload.threadId}, ${event.payload.projectId}, NULL, NULL, NULL, 0, 0, NULL,
            0, 0, 0, 0, 0, 1, ${event.eventId}, ${event.sequence}, ${event.occurredAt})`;
        return;
      case "project.deleted":
        yield* sql`DELETE FROM projection_thread_attention_observations WHERE thread_id IN
          (SELECT thread_id FROM projection_thread_awareness WHERE project_id = ${event.payload.projectId})`;
        yield* sql`DELETE FROM projection_thread_attention_turns WHERE thread_id IN
          (SELECT thread_id FROM projection_thread_awareness WHERE project_id = ${event.payload.projectId})`;
        yield* sql`DELETE FROM projection_thread_attention_lifecycle WHERE project_id = ${event.payload.projectId}`;
        yield* sql`DELETE FROM projection_thread_awareness WHERE project_id = ${event.payload.projectId}`;
        return;
      case "thread.deleted":
        yield* sql`DELETE FROM projection_thread_attention_observations WHERE thread_id = ${event.payload.threadId}`;
        yield* sql`DELETE FROM projection_thread_attention_lifecycle WHERE thread_id = ${event.payload.threadId}`;
        yield* sql`DELETE FROM projection_thread_attention_turns WHERE thread_id = ${event.payload.threadId}`;
        yield* sql`DELETE FROM projection_thread_awareness WHERE thread_id = ${event.payload.threadId}`;
        return;
      case "thread.reverted":
        yield* sql`UPDATE projection_thread_attention_lifecycle SET status = 'resolved', reason_code = 'thread_reverted',
          revision = revision + 1, source_event_id = ${event.eventId}, source_sequence = ${event.sequence},
          updated_at = ${event.occurredAt}, resolved_at = ${event.occurredAt}
          WHERE thread_id = ${event.payload.threadId} AND status = 'open'`;
        yield* sql`UPDATE projection_thread_attention_turns SET phase = 'interrupted', source_sequence = ${event.sequence}
          WHERE thread_id = ${event.payload.threadId}`;
        yield* sql`UPDATE projection_thread_awareness SET base_phase = NULL, pending_start = 0, stop_requested = 0
          WHERE thread_id = ${event.payload.threadId}`;
        break;
      case "thread.turn-start-requested":
        yield* sql`UPDATE projection_thread_awareness SET pending_start = 1, stop_requested = 0 WHERE thread_id = ${event.payload.threadId}`;
        break;
      case "thread.session-stop-requested":
        yield* sql`UPDATE projection_thread_awareness SET stop_requested = 1 WHERE thread_id = ${event.payload.threadId}`;
        break;
      case "thread.turn-interrupt-requested":
        yield* sql`UPDATE projection_thread_awareness SET stop_requested = 1 WHERE thread_id = ${event.payload.threadId}
          AND (${event.payload.turnId ?? null} IS NULL OR turn_id = ${event.payload.turnId ?? null})`;
        break;
      case "thread.session-set":
        yield* applyLifecycle(event);
        break;
      default:
        break;
    }
    if (event.aggregateKind === "thread")
      yield* refreshSummary(ThreadId.make(event.aggregateId), event);
  });
  const mapError = (operation: string) => (cause: unknown) =>
    Schema.isSchemaError(cause)
      ? toPersistenceDecodeError(operation)(cause)
      : toPersistenceSqlError(operation)(cause);
  return ProjectionThreadAttentionCurrentRepository.of({
    subscribeResets: PubSub.subscribe(resets).pipe(Effect.map(Stream.fromSubscription)),
    beginRebuild: sql
      .withTransaction(
        Effect.gen(function* () {
          yield* sql`UPDATE attention_delivery_state SET generation = lower(hex(randomblob(16))), ready = 0, floor = head WHERE id = 1`;
          yield* sql`DELETE FROM attention_delivery_changes`;
        }),
      )
      .pipe(
        Effect.tap(() => PubSub.publish(resets, undefined)),
        Effect.mapError(mapError("CurrentAttention.beginRebuild")),
      ),
    finishRebuild: sql`UPDATE attention_delivery_state SET ready = 1 WHERE id = 1`.pipe(
      Effect.asVoid,
      Effect.tap(() => PubSub.publish(resets, undefined)),
      Effect.mapError(mapError("CurrentAttention.finishRebuild")),
    ),
    project: (event) => project(event).pipe(Effect.mapError(mapError("CurrentAttention.project"))),
    listByThreadId: (input) => list(input).pipe(Effect.mapError(mapError("CurrentAttention.list"))),
    getSummary: (threadId) =>
      readSummary(threadId).pipe(
        Effect.map(Option.map((row) => ({ ...row, countsOverflowed: row.countsOverflowed === 1 }))),
        Effect.mapError(mapError("CurrentAttention.getSummary")),
      ),
    reset: sql
      .withTransaction(
        Effect.gen(function* () {
          yield* sql`DELETE FROM projection_thread_attention_current`;
          yield* sql`DELETE FROM projection_thread_attention_context`;
          yield* sql`DELETE FROM projection_thread_attention_lifecycle`;
          yield* sql`DELETE FROM projection_thread_attention_turns`;
          yield* sql`DELETE FROM projection_thread_attention_observations`;
          yield* sql`DELETE FROM projection_thread_awareness`;
          yield* sql`DELETE FROM projection_state WHERE projector = ${CURRENT_ATTENTION_PROJECTOR}`;
          yield* sql`DELETE FROM attention_delivery_rows`;
          yield* sql`DELETE FROM attention_delivery_changes`;
          yield* sql`UPDATE attention_delivery_state SET generation = lower(hex(randomblob(16))), floor = head, ready = 0 WHERE id = 1`;
        }),
      )
      .pipe(Effect.tap(() => PubSub.publish(resets, undefined)))
      .pipe(Effect.mapError(mapError("CurrentAttention.reset"))),
  });
});

export const ProjectionThreadAttentionCurrentRepositoryLive = Layer.effect(
  ProjectionThreadAttentionCurrentRepository,
  make,
);
