// @effect-diagnostics nodeBuiltinImport:off
import * as NodeCrypto from "node:crypto";
import {
  AttentionDeliveryCursor,
  AttentionPageToken,
  AttentionEntity,
  AttentionStreamMessage,
  AttentionSyncError,
  type AttentionSubscribeInput,
  type AttentionFilter,
  type AttentionChange,
  type AttentionResetReason,
  type EnvironmentId,
  type EnvironmentAuthorizationError,
  NonNegativeInt,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Clock from "effect/Clock";
import * as Schema from "effect/Schema";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";
import * as Option from "effect/Option";
import * as Scope from "effect/Scope";
import * as Exit from "effect/Exit";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import { OrchestrationEngineService } from "./Services/OrchestrationEngine.ts";
import { ProjectionThreadAttentionCurrentRepository } from "../persistence/Services/ProjectionThreadAttentionCurrent.ts";
import { makeLiveStreamBudget } from "./LiveStreamBudget.ts";
import { affectsCurrentAttention } from "../persistence/Layers/ProjectionThreadAttentionCurrent.ts";

export const ATTENTION_MESSAGE_BYTES = 64 * 1024;
export const ATTENTION_BOOTSTRAP_MS = 30_000;
const tokenSchema = Schema.Struct({
  kind: Schema.Literals(["cursor", "page"]),
  generation: Schema.String,
  binding: Schema.String,
  position: NonNegativeInt,
  expiresAt: NonNegativeInt,
});
const encodeToken = Schema.encodeSync(Schema.fromJsonString(tokenSchema));
const decodeToken = Schema.decodeUnknownOption(Schema.fromJsonString(tokenSchema));
const decodeEntity = Schema.decodeUnknownEffect(Schema.fromJsonString(AttentionEntity));
const encodeFrame = Schema.encodeSync(Schema.fromJsonString(AttentionStreamMessage));
const encodeFilter = Schema.encodeSync(
  Schema.fromJsonString(
    Schema.Struct({
      environmentId: Schema.String,
      scope: Schema.String,
      projects: Schema.Array(Schema.String),
      threads: Schema.Array(Schema.String),
      resolved: Schema.Boolean,
    }),
  ),
);

export function attentionFilterBinding(
  environmentId: EnvironmentId,
  scope: string,
  filter: AttentionFilter,
) {
  return NodeCrypto.createHash("sha256")
    .update(
      encodeFilter({
        environmentId,
        scope,
        projects: [...new Set(filter.projectIds)].sort(),
        threads: [...new Set(filter.threadIds)].sort(),
        resolved: filter.includeResolved === true,
      }),
    )
    .digest("hex");
}
interface DeliveryState {
  readonly generation: string;
  readonly head: number;
  readonly floor: number;
  readonly ready: number;
}
interface StoredRow {
  readonly entity_key: string;
  readonly version: number;
  readonly data_json: string | null;
  readonly oversized: number;
  readonly project_id: string | null;
  readonly thread_id: string | null;
  readonly status: string | null;
  readonly before_project?: string | null;
  readonly before_thread?: string | null;
  readonly before_status?: string | null;
}

/** One subscription owns bootstrap, replay and live mode. Domain events are only post-commit wakeups. */
export const makeAttentionStream = (
  input: AttentionSubscribeInput,
  options: {
    readonly environmentId: EnvironmentId;
    readonly scopeBinding: string;
    readonly secret: Uint8Array;
    readonly authorize: Effect.Effect<void, EnvironmentAuthorizationError | AttentionSyncError>;
    readonly authorizationChanges: Stream.Stream<unknown>;
    readonly expiresAtMs?: number;
  },
) =>
  Stream.unwrap(
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const engine = yield* OrchestrationEngineService;
      const attention = yield* ProjectionThreadAttentionCurrentRepository;
      const filter = input.filter ?? {};
      const pageSize = input.pageSize ?? 50;
      const binding = attentionFilterBinding(options.environmentId, options.scopeBinding, filter);
      const sign = (payload: typeof tokenSchema.Type) => {
        const body = Buffer.from(encodeToken(payload)).toString("base64url");
        return `${body}.${NodeCrypto.createHmac("sha256", options.secret).update(body).digest("base64url")}`;
      };
      const parse = (cursor: AttentionDeliveryCursor) => {
        const parts = cursor.split(".");
        if (parts.length !== 2) return Option.none<typeof tokenSchema.Type>();
        const body = parts[0]!,
          signature = Buffer.from(parts[1]!, "base64url");
        const expected = NodeCrypto.createHmac("sha256", options.secret).update(body).digest();
        if (
          signature.length !== expected.length ||
          !NodeCrypto.timingSafeEqual(signature, expected)
        )
          return Option.none<typeof tokenSchema.Type>();
        return decodeToken(Buffer.from(body, "base64url").toString("utf8"));
      };
      const wake = yield* Queue.sliding<void>(1);
      yield* Effect.addFinalizer(() => Queue.shutdown(wake));
      const watches = yield* Scope.fork(yield* Effect.scope);
      const domain = yield* engine.subscribeDomainEvents.pipe(Scope.provide(watches));
      const resets = yield* attention.subscribeResets.pipe(Scope.provide(watches));
      yield* Stream.mergeAll(
        [
          domain.pipe(
            Stream.filter(affectsCurrentAttention),
            Stream.map(() => undefined),
          ),
          resets,
          options.authorizationChanges.pipe(Stream.map(() => undefined)),
        ],
        { concurrency: "unbounded" },
      ).pipe(
        Stream.runForEach(() => Queue.offer(wake, undefined)),
        Effect.forkIn(watches),
      );
      const state = () =>
        sql<DeliveryState>`SELECT generation, head, floor, ready FROM attention_delivery_state WHERE id=1`.pipe(
          Effect.flatMap((rows) =>
            rows[0]
              ? Effect.succeed(rows[0])
              : Effect.fail(
                  new AttentionSyncError({
                    reason: "unavailable",
                    message: "Attention delivery state is unavailable.",
                  }),
                ),
          ),
        );
      // NodeSqliteClient serializes this short transaction with the projection writer.
      yield* options.authorize;
      const initial = yield* sql
        .withTransaction(options.authorize.pipe(Effect.andThen(state())))
        .pipe(
          Effect.catchTag("SqlError", () =>
            Effect.fail(
              new AttentionSyncError({
                reason: "unavailable",
                message: "Could not capture attention watermark.",
              }),
            ),
          ),
        );
      const started = yield* Clock.currentTimeMillis;
      let position = initial.head;
      const generation = initial.generation;
      let pendingReset: AttentionResetReason | undefined = initial.ready ? undefined : "rebuilding";
      if (input.cursor !== undefined) {
        const token = parse(input.cursor);
        if (Option.isNone(token) || token.value.kind !== "cursor")
          return yield* new AttentionSyncError({
            reason: "invalid-cursor",
            message: "Malformed attention delivery cursor.",
          });
        if (token.value.binding !== binding)
          return yield* new AttentionSyncError({
            reason: "cursor-scope-mismatch",
            message:
              "Attention cursor belongs to another environment, filter or authorized session.",
          });
        if (token.value.generation !== generation) pendingReset = "generation-changed";
        else if (
          token.value.expiresAt < started ||
          token.value.position < initial.floor ||
          token.value.position > initial.head
        )
          pendingReset = "replay-unavailable";
        else position = token.value.position;
      }
      const cursorAt = (value: number) =>
        AttentionDeliveryCursor.make(
          sign({
            kind: "cursor",
            generation,
            binding,
            position: value,
            expiresAt: started + 24 * 60 * 60 * 1000,
          }),
        );
      let cursor = input.cursor && !pendingReset ? input.cursor : cursorAt(position);
      let phase: "begin" | "pages" | "fence" | "replay" | "live" | "ended" = "begin";
      let afterKey = "";
      let pageIndex = 0;
      let previousPageToken: AttentionPageToken | null = null;
      let fence = initial.head;
      yield* Effect.sleep(ATTENTION_BOOTSTRAP_MS).pipe(
        Effect.andThen(
          Effect.suspend(() =>
            phase === "live" || phase === "ended"
              ? Effect.void
              : Effect.gen(function* () {
                  pendingReset = "bootstrap-expired";
                  yield* Scope.close(watches, Exit.void);
                  yield* Queue.offer(wake, undefined);
                }),
          ),
        ),
        Effect.forkScoped,
      );
      if (options.expiresAtMs !== undefined)
        yield* Effect.sleep(Math.max(0, options.expiresAtMs - started)).pipe(
          Effect.andThen(Queue.offer(wake, undefined)),
          Effect.forkScoped,
        );
      const matches = (
        project: string | null | undefined,
        thread: string | null | undefined,
        status: string | null | undefined,
      ) =>
        project != null &&
        thread != null &&
        (!filter.projectIds?.length || filter.projectIds.some((id) => id === project)) &&
        (!filter.threadIds?.length || filter.threadIds.some((id) => id === thread)) &&
        (filter.includeResolved === true || status !== "resolved");
      const reset = (reason: AttentionResetReason): AttentionStreamMessage => {
        phase = "ended";
        return { type: "reset-required", reason };
      };
      const checkpoint = () => ({
        environmentId: options.environmentId,
        generation,
        cursor,
        position,
      });
      const next = Effect.fn("AttentionSync.next")(function* (): Effect.fn.Return<
        AttentionStreamMessage | undefined,
        AttentionSyncError | EnvironmentAuthorizationError
      > {
        if (phase === "ended") return undefined;
        yield* options.authorize;
        if (pendingReset) return reset(pendingReset);
        while (true) {
          const now = yield* Clock.currentTimeMillis;
          if (phase !== "live" && now - started >= ATTENTION_BOOTSTRAP_MS)
            return reset("bootstrap-expired");
          const result = yield* sql
            .withTransaction(
              Effect.gen(function* () {
                yield* options.authorize;
                const current = yield* state();
                if (current.generation !== generation)
                  return { reset: "generation-changed" as const };
                if (!current.ready) return { reset: "rebuilding" as const };
                if (position < current.floor || position > current.head)
                  return { reset: "replay-unavailable" as const };
                if (phase === "begin") return { current };
                if (phase === "pages") {
                  const rows = yield* sql<StoredRow>`
            SELECT CASE WHEN bytes > ${ATTENTION_MESSAGE_BYTES} THEN '' ELSE entity_key END AS entity_key,
              version, CASE WHEN bytes > ${ATTENTION_MESSAGE_BYTES} THEN NULL ELSE data_json END AS data_json,
              CASE WHEN bytes > ${ATTENTION_MESSAGE_BYTES} THEN 1 ELSE 0 END AS oversized,
              CASE WHEN bytes > ${ATTENTION_MESSAGE_BYTES} THEN NULL ELSE project_id END AS project_id,
              CASE WHEN bytes > ${ATTENTION_MESSAGE_BYTES} THEN NULL ELSE thread_id END AS thread_id, status
            FROM attention_delivery_rows WHERE entity_key > ${afterKey}
              ${filter.projectIds?.length ? sql`AND ${sql.in("project_id", filter.projectIds)}` : sql``}
              ${filter.threadIds?.length ? sql`AND ${sql.in("thread_id", filter.threadIds)}` : sql``}
              ${filter.includeResolved ? sql`` : sql`AND status != 'resolved'`}
            ORDER BY entity_key LIMIT ${pageSize}
          `;
                  return { rows, current };
                }
                if (phase === "fence") return { current };
                const through = phase === "replay" ? fence : current.head;
                const rows = yield* sql<StoredRow>`
          SELECT CASE WHEN oversized THEN '' ELSE entity_key END AS entity_key,
            sequence AS version, data_json, oversized,
            CASE WHEN oversized THEN NULL ELSE project_id END AS project_id,
            CASE WHEN oversized THEN NULL ELSE thread_id END AS thread_id, status,
            CASE WHEN oversized THEN NULL ELSE before_project END AS before_project,
            CASE WHEN oversized THEN NULL ELSE before_thread END AS before_thread, before_status
          FROM attention_delivery_changes WHERE sequence > ${position} AND sequence <= ${through}
          ORDER BY sequence LIMIT ${pageSize}
        `;
                return { rows, current, through };
              }),
            )
            .pipe(
              Effect.catchTag("SqlError", () =>
                Effect.fail(
                  new AttentionSyncError({
                    reason: "unavailable",
                    message: "Could not read attention delivery state.",
                  }),
                ),
              ),
            );
          if ("reset" in result) return reset(result.reset);
          if (phase === "begin") {
            phase = input.cursor === undefined ? "pages" : "fence";
            return {
              ...checkpoint(),
              type: "begin",
              mode: input.cursor === undefined ? "snapshot" : "resume",
            };
          }
          if (phase === "fence") {
            fence = result.current.head;
            phase = "replay";
            continue;
          }
          if (!("rows" in result))
            return yield* new AttentionSyncError({
              reason: "unavailable",
              message: "Invalid attention stream phase.",
            });
          const changes: AttentionChange[] = [];
          let bytes = 4096;
          const beforeCursor = cursor;
          let consumed = 0;
          for (const row of result.rows) {
            if (phase !== "pages" && row.version !== position + 1)
              return reset("replay-unavailable");
            if (row.oversized) return reset("message-too-large");
            const entity =
              row.data_json === null
                ? null
                : yield* decodeEntity(row.data_json).pipe(
                    Effect.mapError(
                      () =>
                        new AttentionSyncError({
                          reason: "unavailable",
                          message: "Invalid projected attention record.",
                        }),
                    ),
                  );
            const include = matches(row.project_id, row.thread_id, row.status);
            const exited = matches(row.before_project, row.before_thread, row.before_status);
            const change = {
              key: row.entity_key,
              version: row.version,
              entity: include ? entity : null,
            };
            const size =
              Buffer.byteLength(row.data_json ?? "") + Buffer.byteLength(row.entity_key) + 256;
            if (bytes + size > ATTENTION_MESSAGE_BYTES && consumed > 0) break;
            if (bytes + size > ATTENTION_MESSAGE_BYTES) return reset("message-too-large");
            bytes += size;
            if (phase === "pages" || include || exited) changes.push(change);
            consumed++;
            if (phase === "pages") afterKey = row.entity_key;
            else position = row.version;
          }
          if (phase === "pages") {
            const pageToken = AttentionPageToken.make(
              sign({
                kind: "page",
                generation,
                binding,
                position: ++pageIndex,
                expiresAt: started + ATTENTION_BOOTSTRAP_MS,
              }),
            );
            const message: AttentionStreamMessage = {
              ...checkpoint(),
              type: "page",
              pageToken,
              previousPageToken,
              entries: changes,
            };
            previousPageToken = pageToken;
            if (consumed === result.rows.length && result.rows.length < pageSize) phase = "fence";
            return message;
          }
          if (consumed > 0) {
            cursor = cursorAt(position);
            return {
              ...checkpoint(),
              type: "delta",
              after: beforeCursor,
              notificationEligible: phase === "live",
              changes,
            };
          }
          if ("through" in result && position < result.through) return reset("replay-unavailable");
          if (phase === "replay") {
            if (position !== fence) return reset("replay-unavailable");
            position = fence;
            cursor = cursorAt(position);
            phase = "live";
            return { ...checkpoint(), type: "sync-complete" };
          }
          yield* Queue.take(wake).pipe(Effect.orDie);
          yield* options.authorize;
        }
      });
      const budget = yield* makeLiveStreamBudget();
      const frames = Stream.unfold(undefined, () =>
        next().pipe(
          Effect.flatMap((message) => {
            if (message === undefined) return Effect.succeed(undefined);
            const bounded =
              Buffer.byteLength(encodeFrame(message)) <= ATTENTION_MESSAGE_BYTES
                ? message
                : reset("message-too-large");
            return budget.retain(bounded).pipe(Effect.map((value) => [value, undefined] as const));
          }),
        ),
      );
      return budget
        .deliver(frames)
        .pipe(
          Stream.catchTag("OrchestrationGetSnapshotError", () =>
            Stream.make(reset("backpressure")),
          ),
        );
    }),
  );
