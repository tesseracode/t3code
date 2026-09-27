import {
  AttentionId,
  type OrchestrationEvent,
  PositiveInt,
  type RequestAttentionItem,
  ThreadId,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type { ProjectionRepositoryError } from "../Errors.ts";

export const CURRENT_ATTENTION_PROJECTOR = "projection.thread-attention-current";
export const ListCurrentAttentionInput = Schema.Struct({
  threadId: ThreadId,
  limit: PositiveInt.check(Schema.isLessThanOrEqualTo(100)),
  afterAttentionId: Schema.optional(AttentionId),
});

export class ProjectionThreadAttentionCurrentRepository extends Context.Service<
  ProjectionThreadAttentionCurrentRepository,
  {
    /** Called inside the pipeline's transaction, which also advances this projector's cursor. */
    readonly project: (event: OrchestrationEvent) => Effect.Effect<void, ProjectionRepositoryError>;
    readonly listByThreadId: (
      input: typeof ListCurrentAttentionInput.Type,
    ) => Effect.Effect<ReadonlyArray<RequestAttentionItem>, ProjectionRepositoryError>;
    /** Clears only this projection and its cursor; pipeline bootstrap replays the durable event store. */
    readonly reset: Effect.Effect<void, ProjectionRepositoryError>;
  }
>()(
  "t3/persistence/Services/ProjectionThreadAttentionCurrent/ProjectionThreadAttentionCurrentRepository",
) {}
