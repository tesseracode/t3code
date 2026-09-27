import * as Schema from "effect/Schema";
import {
  ApprovalRequestId,
  EventId,
  IsoDateTime,
  NonNegativeInt,
  PositiveInt,
  ProjectId,
  ThreadId,
  TurnId,
} from "./baseSchemas.ts";

export const AttentionId = Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/)).pipe(
  Schema.brand("AttentionId"),
);
export type AttentionId = typeof AttentionId.Type;

export const RequestAttentionKind = Schema.Literals(["approval", "user_input"]);
export type RequestAttentionKind = typeof RequestAttentionKind.Type;

const fields = {
  attentionId: AttentionId,
  projectId: ProjectId,
  threadId: ThreadId,
  turnId: Schema.NullOr(TurnId),
  requestId: ApprovalRequestId,
  kind: RequestAttentionKind,
  revision: PositiveInt,
  sourceEventId: EventId,
  sourceSequence: NonNegativeInt,
  openedAt: IsoDateTime,
  updatedAt: IsoDateTime,
};

export const RequestAttentionItem = Schema.Union([
  Schema.Struct({
    ...fields,
    status: Schema.Literal("open"),
    reasonCode: Schema.Literals(["approval_requested", "user_input_requested", "response_failed"]),
    resolvedAt: Schema.Null,
  }),
  Schema.Struct({
    ...fields,
    status: Schema.Literal("resolved"),
    reasonCode: Schema.Literals(["request_resolved", "thread_reverted"]),
    resolvedAt: IsoDateTime,
  }),
]);
export type RequestAttentionItem = typeof RequestAttentionItem.Type;
