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
  TrimmedNonEmptyString,
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

export const ProviderLifecycleEvidence = Schema.Struct({
  providerEventId: EventId,
  providerKey: TrimmedNonEmptyString,
  turnId: Schema.NullOr(TurnId),
  transition: Schema.Literals([
    "starting",
    "ready",
    "running",
    "completed",
    "failed",
    "disconnected",
    "interrupted",
  ]),
  failureReason: Schema.optional(Schema.Literals(["provider_failed", "runtime_failed"])),
});
export type ProviderLifecycleEvidence = typeof ProviderLifecycleEvidence.Type;

const lifecycleFields = {
  ...fields,
  turnId: TurnId,
  requestId: Schema.Null,
  kind: Schema.Literals(["failure", "disconnect"]),
  title: Schema.Literals(["Agent failed", "Provider disconnected"]),
};
export const LifecycleAttentionItem = Schema.Union([
  Schema.Struct({
    ...lifecycleFields,
    status: Schema.Literal("open"),
    reasonCode: Schema.Literals(["provider_failed", "runtime_failed", "provider_disconnected"]),
    resolvedAt: Schema.Null,
  }),
  Schema.Struct({
    ...lifecycleFields,
    status: Schema.Literal("resolved"),
    reasonCode: Schema.Literals([
      "provider_recovered",
      "turn_completed",
      "turn_interrupted",
      "thread_reverted",
    ]),
    resolvedAt: IsoDateTime,
  }),
]);
export type LifecycleAttentionItem = typeof LifecycleAttentionItem.Type;
export const ThreadAttentionItem = Schema.Union([RequestAttentionItem, LifecycleAttentionItem]);
export type ThreadAttentionItem = typeof ThreadAttentionItem.Type;

export const ThreadAwarenessPhase = Schema.Literals([
  "starting",
  "running",
  "waiting_for_approval",
  "waiting_for_input",
  "completed",
  "failed",
  "stale",
]);
export type ThreadAwarenessPhase = typeof ThreadAwarenessPhase.Type;
export const ATTENTION_SUMMARY_COUNT_LIMIT = 999;
const Count = NonNegativeInt.check(Schema.isLessThanOrEqualTo(ATTENTION_SUMMARY_COUNT_LIMIT));
export const ThreadAwarenessSummary = Schema.Struct({
  threadId: ThreadId,
  projectId: ProjectId,
  turnId: Schema.NullOr(TurnId),
  phase: Schema.NullOr(ThreadAwarenessPhase),
  approvalCount: Count,
  inputCount: Count,
  failureCount: Count,
  disconnectCount: Count,
  countsOverflowed: Schema.Boolean,
  revision: PositiveInt,
  sourceEventId: EventId,
  sourceSequence: NonNegativeInt,
  updatedAt: IsoDateTime,
});
export type ThreadAwarenessSummary = typeof ThreadAwarenessSummary.Type;
