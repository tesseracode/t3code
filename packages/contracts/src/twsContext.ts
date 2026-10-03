import * as Schema from "effect/Schema";
import {
  EnvironmentId,
  IsoDateTime,
  NonNegativeInt,
  ProjectId,
  ThreadId,
  TrimmedNonEmptyString,
} from "./baseSchemas.ts";
import {
  TwsFeatureBindingId,
  TwsStackNodeBindingId,
  TwsWorkspaceBindingId,
  TwsLocator,
  TwsLocators,
} from "./twsBindings.ts";

export const TwsObservationId = TrimmedNonEmptyString.pipe(Schema.brand("TwsObservationId"));
export type TwsObservationId = typeof TwsObservationId.Type;
export const TwsContextFreshness = Schema.Literals(["confirmed", "stale", "unknown", "disabled"]);
export const TwsContextReason = Schema.Literals([
  "disabled",
  "not-observed",
  "source-unavailable",
  "incomplete-scope",
  "ambiguous",
  "no-match",
  "explicit",
  "exact-execution",
  "cleared",
  "location-changed",
  "source-identity-changed",
  "thread-unavailable",
]);
export const TwsThreadContext = Schema.Struct({
  environmentId: EnvironmentId,
  threadId: ThreadId,
  projectId: ProjectId,
  revision: NonNegativeInt,
  mode: Schema.Literals(["auto", "explicit", "none"]),
  workspaceBindingId: Schema.NullOr(TwsWorkspaceBindingId),
  featureBindingId: Schema.NullOr(TwsFeatureBindingId),
  /** A stale reference is last-known evidence, never a current execution claim. */
  stackNodeBindingId: Schema.NullOr(TwsStackNodeBindingId),
  freshness: TwsContextFreshness,
  reason: TwsContextReason,
  observationId: Schema.NullOr(TwsObservationId),
  lastConfirmedAt: Schema.NullOr(IsoDateTime),
});
export type TwsThreadContext = typeof TwsThreadContext.Type;
export const TwsIntegrationState = Schema.Struct({
  environmentId: EnvironmentId,
  status: Schema.Literals([
    "disabled",
    "unknown",
    "refreshing",
    "ready",
    "degraded",
    "unavailable",
  ]),
  generation: NonNegativeInt,
  observationId: Schema.NullOr(TwsObservationId),
  observedAt: Schema.NullOr(IsoDateTime),
  completeScopes: NonNegativeInt,
  incompleteScopes: NonNegativeInt,
});
export type TwsIntegrationState = typeof TwsIntegrationState.Type;
export const TwsContextQuery = Schema.Struct({
  threadIds: Schema.Array(ThreadId).check(Schema.isMaxLength(100)),
});
export const TwsContextQueryResult = Schema.Struct({
  integration: TwsIntegrationState,
  contexts: Schema.Array(TwsThreadContext).check(Schema.isMaxLength(100)),
  unavailableThreadIds: Schema.Array(ThreadId).check(Schema.isMaxLength(100)),
});
export const TwsContextChoice = Schema.Union([
  Schema.Struct({
    mode: Schema.Literal("explicit"),
    workspaceBindingId: TwsWorkspaceBindingId,
    featureBindingId: Schema.NullOr(TwsFeatureBindingId),
  }),
  Schema.Struct({ mode: Schema.Literal("auto") }),
  Schema.Struct({ mode: Schema.Literal("none") }),
]);
export type TwsContextChoice = typeof TwsContextChoice.Type;
export const TwsContextSetInput = Schema.Struct({
  threadId: ThreadId,
  expectedRevision: NonNegativeInt,
  choice: TwsContextChoice,
});
export type TwsContextSetInput = typeof TwsContextSetInput.Type;
export const TwsTopologyEntry = Schema.Struct({
  kind: Schema.Literals(["workspace", "feature", "node"]),
  bindingId: TrimmedNonEmptyString,
  workspaceBindingId: TwsWorkspaceBindingId,
  featureBindingId: Schema.NullOr(TwsFeatureBindingId),
  projectIds: Schema.Array(ProjectId).check(Schema.isMaxLength(100)),
  projectIdsOverflowed: Schema.Boolean,
  label: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
  archived: Schema.Boolean,
  materialized: Schema.Boolean,
  requiresConfirmation: Schema.Boolean,
  complete: Schema.Boolean,
  presence: Schema.Literals(["present", "missing", "unknown"]),
  missingObservations: Schema.Array(TwsObservationId).check(Schema.isMaxLength(2)),
  observationId: Schema.NullOr(TwsObservationId),
  lastConfirmedAt: Schema.NullOr(IsoDateTime),
});
export type TwsTopologyEntry = typeof TwsTopologyEntry.Type;
export const TwsTopologyQuery = Schema.Struct({
  workspaceBindingId: Schema.optional(TwsWorkspaceBindingId),
  featureBindingId: Schema.optional(TwsFeatureBindingId),
  after: Schema.optional(TrimmedNonEmptyString.check(Schema.isMaxLength(256))),
  limit: Schema.optional(Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 100 }))),
});
export type TwsTopologyQuery = typeof TwsTopologyQuery.Type;
export const TwsTopologyQueryResult = Schema.Struct({
  integration: TwsIntegrationState,
  entries: Schema.Array(TwsTopologyEntry).check(Schema.isMaxLength(100)),
  nextCursor: Schema.NullOr(Schema.String),
});
export const TwsProvenanceInput = Schema.Struct({
  bindingId: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
});
export const TwsProvenance = Schema.Struct({
  bindingId: TrimmedNonEmptyString,
  canonicalLocator: TwsLocator,
  locators: TwsLocators,
});
export class TwsContextError extends Schema.TaggedError<TwsContextError>()("TwsContextError", {
  reason: Schema.Literals([
    "disabled",
    "unavailable",
    "conflict",
    "invalid-selection",
    "thread-unavailable",
  ]),
  message: Schema.String,
}) {}
