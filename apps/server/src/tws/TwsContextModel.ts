import * as Schema from "effect/Schema";
import {
  IsoDateTime,
  ProjectId,
  ThreadId,
  TwsContextChoice,
  TwsFeatureBinding,
  TwsObservationId,
  TwsStackNodeBinding,
  TwsThreadContext,
  TwsWorkspaceBinding,
  TwsWorkspaceBindingId,
  type TwsTopologyEntry,
} from "@t3tools/contracts";

export const TwsExecution = Schema.Struct({
  path: Schema.String,
  root: Schema.String,
  commonDirectory: Schema.String,
  branch: Schema.NullOr(Schema.String),
});
export type TwsExecution = typeof TwsExecution.Type;
const common = {
  workspaceBindingId: TwsWorkspaceBindingId,
  label: Schema.String,
  complete: Schema.Boolean,
  requiresConfirmation: Schema.Boolean,
  presence: Schema.Literals(["present", "missing", "unknown"]),
  observationId: Schema.NullOr(TwsObservationId),
  lastConfirmedAt: Schema.NullOr(IsoDateTime),
  missingObservations: Schema.Array(TwsObservationId),
};
export const TwsRecord = Schema.Union([
  Schema.Struct({
    ...common,
    kind: Schema.Literal("workspace"),
    binding: TwsWorkspaceBinding,
    execution: Schema.NullOr(TwsExecution),
    projectIds: Schema.Array(ProjectId),
    identityKey: Schema.String,
  }),
  Schema.Struct({ ...common, kind: Schema.Literal("feature"), binding: TwsFeatureBinding }),
  Schema.Struct({
    ...common,
    kind: Schema.Literal("node"),
    binding: TwsStackNodeBinding,
    execution: Schema.NullOr(TwsExecution),
  }),
]);
export type TwsRecord = typeof TwsRecord.Type;
export const TwsThreadInput = Schema.Struct({
  threadId: ThreadId,
  projectId: ProjectId,
  workspaceRoot: Schema.String,
  worktreePath: Schema.NullOr(Schema.String),
  branch: Schema.NullOr(Schema.String),
  incarnation: Schema.NullOr(Schema.String),
});
export type TwsThreadInput = typeof TwsThreadInput.Type;
export const TwsStoredContext = Schema.Struct({
  context: TwsThreadContext,
  choice: TwsContextChoice,
  incarnation: Schema.String,
  locationKey: Schema.String,
});
export type TwsStoredContext = typeof TwsStoredContext.Type;

export function twsRecordId(record: TwsRecord): string {
  switch (record.kind) {
    case "workspace":
      return record.binding.workspaceBindingId;
    case "feature":
      return record.binding.featureBindingId;
    case "node":
      return record.binding.stackNodeBindingId;
  }
}
export function twsThreadLocationKey(thread: TwsThreadInput) {
  return JSON.stringify([
    thread.projectId,
    thread.workspaceRoot,
    thread.worktreePath,
    thread.branch,
  ]);
}

export function twsTopologyEntry(
  record: TwsRecord,
  projectIds: ReadonlyArray<ProjectId>,
): TwsTopologyEntry {
  return {
    kind: record.kind,
    bindingId: twsRecordId(record),
    workspaceBindingId: record.workspaceBindingId,
    featureBindingId: record.kind === "workspace" ? null : record.binding.featureBindingId,
    projectIds: projectIds.slice(0, 100),
    projectIdsOverflowed: projectIds.length > 100,
    label: record.label,
    archived: record.kind === "node" && record.binding.archived,
    materialized: record.kind === "node" && record.execution !== null,
    requiresConfirmation: record.requiresConfirmation,
    complete: record.complete,
    presence: record.presence,
    missingObservations: record.missingObservations,
    observationId: record.observationId,
    lastConfirmedAt: record.lastConfirmedAt,
  };
}
