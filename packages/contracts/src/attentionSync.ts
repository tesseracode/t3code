import * as Schema from "effect/Schema";
import {
  EnvironmentId,
  NonNegativeInt,
  PositiveInt,
  ProjectId,
  ThreadId,
  TrimmedNonEmptyString,
} from "./baseSchemas.ts";
import { ThreadAttentionItem, ThreadAwarenessSummary } from "./attention.ts";

const OpaqueToken = Schema.String.check(
  Schema.isMaxLength(4096),
  Schema.isPattern(/^[A-Za-z0-9_.-]+$/),
);
export const AttentionDeliveryCursor = OpaqueToken.pipe(Schema.brand("AttentionDeliveryCursor"));
export type AttentionDeliveryCursor = typeof AttentionDeliveryCursor.Type;
export const AttentionPageToken = OpaqueToken.pipe(Schema.brand("AttentionPageToken"));
export type AttentionPageToken = typeof AttentionPageToken.Type;
export const AttentionFilter = Schema.Struct({
  projectIds: Schema.optional(Schema.Array(ProjectId).check(Schema.isMaxLength(32))),
  threadIds: Schema.optional(Schema.Array(ThreadId).check(Schema.isMaxLength(32))),
  includeResolved: Schema.optional(Schema.Boolean),
});
export type AttentionFilter = typeof AttentionFilter.Type;
export const AttentionSubscribeInput = Schema.Struct({
  filter: Schema.optional(AttentionFilter),
  cursor: Schema.optional(AttentionDeliveryCursor),
  pageSize: Schema.optional(PositiveInt.check(Schema.isLessThanOrEqualTo(100))),
});
export type AttentionSubscribeInput = typeof AttentionSubscribeInput.Type;
export const AttentionEntity = Schema.Union([
  Schema.Struct({ type: Schema.Literal("item"), value: ThreadAttentionItem }),
  Schema.Struct({ type: Schema.Literal("summary"), value: ThreadAwarenessSummary }),
]);
export type AttentionEntity = typeof AttentionEntity.Type;
export const AttentionChange = Schema.Struct({
  key: TrimmedNonEmptyString,
  version: NonNegativeInt,
  entity: Schema.NullOr(AttentionEntity),
});
export type AttentionChange = typeof AttentionChange.Type;
const checkpoint = {
  environmentId: EnvironmentId,
  generation: TrimmedNonEmptyString,
  cursor: AttentionDeliveryCursor,
  position: NonNegativeInt,
};
export const AttentionResetReason = Schema.Literals([
  "generation-changed",
  "replay-unavailable",
  "bootstrap-expired",
  "message-too-large",
  "backpressure",
  "rebuilding",
]);
export type AttentionResetReason = typeof AttentionResetReason.Type;
export const AttentionStreamMessage = Schema.Union([
  Schema.Struct({
    ...checkpoint,
    type: Schema.Literal("begin"),
    mode: Schema.Literals(["snapshot", "resume"]),
  }),
  Schema.Struct({
    ...checkpoint,
    type: Schema.Literal("page"),
    pageToken: AttentionPageToken,
    previousPageToken: Schema.NullOr(AttentionPageToken),
    entries: Schema.Array(AttentionChange).check(Schema.isMaxLength(100)),
  }),
  Schema.Struct({
    ...checkpoint,
    type: Schema.Literal("delta"),
    after: AttentionDeliveryCursor,
    notificationEligible: Schema.Boolean,
    changes: Schema.Array(AttentionChange).check(Schema.isMaxLength(100)),
  }),
  Schema.Struct({ ...checkpoint, type: Schema.Literal("sync-complete") }),
  Schema.Struct({ type: Schema.Literal("reset-required"), reason: AttentionResetReason }),
]);
export type AttentionStreamMessage = typeof AttentionStreamMessage.Type;
export class AttentionSyncError extends Schema.TaggedError<AttentionSyncError>()(
  "AttentionSyncError",
  {
    reason: Schema.Literals(["invalid-cursor", "cursor-scope-mismatch", "unavailable"]),
    message: Schema.String,
  },
) {}
