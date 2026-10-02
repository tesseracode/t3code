import type {
  EnvironmentId,
  TwsContextChoice,
  TwsIntegrationState,
  TwsThreadContext,
} from "@t3tools/contracts";
import type {
  TwsExecution,
  TwsRecord,
  TwsStoredContext,
  TwsThreadInput,
} from "./TwsContextModel.ts";
import { twsThreadLocationKey } from "./TwsContextModel.ts";

export function initialTwsContext(
  environmentId: EnvironmentId,
  thread: TwsThreadInput,
): TwsThreadContext {
  return {
    environmentId,
    threadId: thread.threadId,
    projectId: thread.projectId,
    revision: 0,
    mode: "auto",
    workspaceBindingId: null,
    featureBindingId: null,
    stackNodeBindingId: null,
    freshness: "unknown",
    reason: "not-observed",
    observationId: null,
    lastConfirmedAt: null,
  };
}

export function invalidateTwsContext(
  previous: TwsStoredContext,
  thread: TwsThreadInput,
): TwsStoredContext {
  const locationKey = twsThreadLocationKey(thread);
  if (locationKey === previous.locationKey) return previous;
  return {
    ...previous,
    locationKey,
    context: {
      ...previous.context,
      revision: previous.context.revision + 1,
      stackNodeBindingId: null,
      freshness: "stale",
      reason: "location-changed",
    },
  };
}

/** Physical evidence can select automatic context, but cannot overwrite an explicit logical choice. */
export function inferTwsContext(input: {
  environmentId: EnvironmentId;
  thread: TwsThreadInput;
  execution: TwsExecution | null;
  records: ReadonlyArray<TwsRecord>;
  integration: TwsIntegrationState;
  previous: TwsStoredContext | undefined;
  choice?: TwsContextChoice;
}): TwsStoredContext {
  const { thread, integration, execution } = input;
  const prior = input.previous?.incarnation === thread.incarnation ? input.previous : undefined;
  const previous = prior ? invalidateTwsContext(prior, thread) : undefined;
  const choice = input.choice ?? previous?.choice ?? { mode: "auto" as const };
  const base = previous?.context ?? initialTwsContext(input.environmentId, thread);
  let next: TwsThreadContext = { ...base, mode: choice.mode, projectId: thread.projectId };
  if (input.choice?.mode === "auto")
    next = {
      ...next,
      workspaceBindingId: null,
      featureBindingId: null,
      stackNodeBindingId: null,
      observationId: null,
      lastConfirmedAt: null,
    };
  if (choice.mode === "explicit")
    next = {
      ...next,
      workspaceBindingId: choice.workspaceBindingId,
      featureBindingId:
        choice.featureBindingId ??
        (base.workspaceBindingId === choice.workspaceBindingId ? base.featureBindingId : null),
      stackNodeBindingId:
        base.workspaceBindingId === choice.workspaceBindingId &&
        (choice.featureBindingId === null || base.featureBindingId === choice.featureBindingId)
          ? base.stackNodeBindingId
          : null,
    };
  const stale = (reason: TwsThreadContext["reason"]) => {
    next = {
      ...next,
      freshness: previous ? "stale" : "unknown",
      reason,
      observationId: integration.observationId,
    };
  };
  if (choice.mode === "none") {
    next = {
      ...next,
      workspaceBindingId: null,
      featureBindingId: null,
      stackNodeBindingId: null,
      freshness: "confirmed",
      reason: "cleared",
      observationId: null,
      lastConfirmedAt: null,
    };
  } else if (
    execution === null ||
    integration.observationId === null ||
    (thread.branch !== null && thread.branch !== execution.branch)
  ) {
    stale(execution === null ? "source-unavailable" : "location-changed");
  } else {
    const workspaces = input.records.filter(
      (record) =>
        record.kind === "workspace" &&
        record.projectIds.includes(thread.projectId) &&
        record.execution?.commonDirectory === execution.commonDirectory,
    );
    const selected =
      choice.mode === "explicit"
        ? workspaces.filter((record) => record.workspaceBindingId === choice.workspaceBindingId)
        : workspaces.filter((record) => record.presence !== "missing");
    if (choice.mode === "auto" && integration.status !== "ready") {
      stale("incomplete-scope");
    } else if (selected.length !== 1) {
      if (choice.mode === "auto" && selected.length === 0 && integration.status === "ready")
        next = {
          ...next,
          workspaceBindingId: null,
          featureBindingId: null,
          stackNodeBindingId: null,
          freshness: "confirmed",
          reason: "no-match",
          observationId: integration.observationId,
          lastConfirmedAt: integration.observedAt,
        };
      else stale(selected.length > 1 ? "ambiguous" : "incomplete-scope");
    } else {
      const workspace = selected[0]!;
      if (
        choice.mode === "auto" &&
        input.choice === undefined &&
        prior?.locationKey === twsThreadLocationKey(thread) &&
        base.workspaceBindingId !== null &&
        base.workspaceBindingId !== workspace.workspaceBindingId
      ) {
        stale("source-identity-changed");
      } else if (
        (!workspace.complete &&
          !(choice.mode === "explicit" && choice.featureBindingId !== null)) ||
        workspace.presence !== "present" ||
        (choice.mode === "auto" &&
          workspace.requiresConfirmation &&
          base.workspaceBindingId !== workspace.workspaceBindingId)
      ) {
        stale(workspace.requiresConfirmation ? "source-identity-changed" : "incomplete-scope");
      } else {
        const features = input.records.filter(
          (record) =>
            record.kind === "feature" &&
            record.workspaceBindingId === workspace.workspaceBindingId &&
            record.presence !== "missing",
        );
        const explicitFeature = choice.mode === "explicit" ? choice.featureBindingId : null;
        const selectedFeatures =
          explicitFeature === null
            ? features
            : features.filter(
                (record) =>
                  record.kind === "feature" && record.binding.featureBindingId === explicitFeature,
              );
        if (
          selectedFeatures.some((record) => !record.complete) ||
          (explicitFeature !== null && selectedFeatures.length !== 1)
        ) {
          stale("incomplete-scope");
        } else {
          const featureIds = new Set(
            selectedFeatures.flatMap((record) =>
              record.kind === "feature" ? [record.binding.featureBindingId] : [],
            ),
          );
          const nodes = input.records.filter(
            (record) =>
              record.kind === "node" &&
              record.complete &&
              record.presence === "present" &&
              featureIds.has(record.binding.featureBindingId) &&
              !record.binding.archived &&
              record.execution?.root === execution.root &&
              record.execution.commonDirectory === execution.commonDirectory &&
              record.execution.branch !== null &&
              record.execution.branch === execution.branch &&
              record.binding.gitBranch === execution.branch,
          );
          const node = nodes.length === 1 && nodes[0]?.kind === "node" ? nodes[0] : undefined;
          const featureId = explicitFeature ?? node?.binding.featureBindingId ?? null;
          if (nodes.length > 1) stale("ambiguous");
          else if (
            node &&
            input.choice === undefined &&
            prior?.locationKey === twsThreadLocationKey(thread) &&
            base.stackNodeBindingId !== null &&
            base.stackNodeBindingId !== node.binding.stackNodeBindingId
          )
            stale("source-identity-changed");
          else if (
            choice.mode === "auto" &&
            input.choice === undefined &&
            prior?.locationKey === twsThreadLocationKey(thread) &&
            base.featureBindingId !== null &&
            featureId !== null &&
            base.featureBindingId !== featureId
          )
            stale("source-identity-changed");
          else
            next = {
              ...next,
              workspaceBindingId: workspace.workspaceBindingId,
              featureBindingId: featureId,
              stackNodeBindingId: node?.binding.stackNodeBindingId ?? null,
              freshness: "confirmed",
              reason: node
                ? "exact-execution"
                : choice.mode === "explicit"
                  ? "explicit"
                  : "no-match",
              observationId: integration.observationId,
              lastConfirmedAt: integration.observedAt,
            };
        }
      }
    }
  }
  const material = (value: TwsThreadContext) =>
    JSON.stringify([
      value.mode,
      value.workspaceBindingId,
      value.featureBindingId,
      value.stackNodeBindingId,
    ]);
  const changed =
    material(next) !== material(base) ||
    JSON.stringify(choice) !== JSON.stringify(previous?.choice ?? { mode: "auto" });
  return {
    context: { ...next, revision: base.revision + (changed ? 1 : 0) },
    choice,
    incarnation: thread.incarnation ?? "",
    locationKey: twsThreadLocationKey(thread),
  };
}
