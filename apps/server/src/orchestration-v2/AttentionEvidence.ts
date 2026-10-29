import {
  ApprovalRequestId,
  type EventId,
  type ProjectId,
  type ProviderLifecycleEvidence,
  type RunId,
  type ThreadId,
  type TurnId,
} from "@t3tools/contracts";

/** Compact projection inputs, not commands or an alternative orchestration event history. */
type Common = {
  readonly eventId: EventId;
  readonly sequence: number;
  readonly occurredAt: string;
};
export type AttentionEvidence = Common &
  (
    | {
        readonly type: "thread.created";
        readonly payload: { readonly threadId: ThreadId; readonly projectId: ProjectId };
      }
    | { readonly type: "project.deleted"; readonly payload: { readonly projectId: ProjectId } }
    | {
        readonly type: "thread.deleted" | "thread.reverted";
        readonly payload: { readonly threadId: ThreadId };
      }
    | {
        readonly type: "run.starting";
        readonly payload: {
          readonly threadId: ThreadId;
          readonly runId: RunId;
          readonly providerKey: string;
        };
      }
    | {
        readonly type: "request.changed";
        readonly payload: {
          readonly threadId: ThreadId;
          readonly activity: {
            readonly kind: string;
            readonly turnId: TurnId | null;
            readonly payload: {
              readonly requestId: ApprovalRequestId;
              readonly responseMode?: "message";
            };
          };
        };
      }
    | {
        readonly type: "lifecycle.observed";
        readonly payload: {
          readonly threadId: ThreadId;
          readonly lifecycle: ProviderLifecycleEvidence;
        };
      }
  );
