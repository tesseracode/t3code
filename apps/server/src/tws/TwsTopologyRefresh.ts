import * as NodeCrypto from "node:crypto";
import {
  TwsContextError,
  TwsFeatureBindingId,
  TwsStackNodeBindingId,
  TwsWorkspaceBindingId,
  type EnvironmentId,
  type ProjectId,
  type TwsObservationId,
  type TwsWorkspaceBinding,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import { TwsBindingRepository } from "../persistence/Services/TwsBindings.ts";
import { TwsCliAdapter } from "./TwsCliAdapter.ts";
import { TwsExecutionResolver } from "./TwsExecutionResolver.ts";
import { mergeTwsLocators } from "./TwsBindingMatch.ts";
import { normalizeTwsStack, normalizeTwsStatus } from "./TwsTopology.ts";
import { twsRecordId, type TwsExecution, type TwsRecord } from "./TwsContextModel.ts";

const encodeIdentityKey = Schema.encodeSync(Schema.fromJsonString(Schema.Array(Schema.String)));
export const collectTwsTopology = Effect.fn("collectTwsTopology")(function* (input: {
  environmentId: EnvironmentId;
  observationId: TwsObservationId;
  observedAt: string;
  previous: ReadonlyArray<TwsRecord>;
  projects: ReadonlyArray<{ readonly projectId: ProjectId; readonly workspaceRoot: string }>;
}) {
  const cli = yield* TwsCliAdapter;
  const bindings = yield* TwsBindingRepository;
  const resolver = yield* TwsExecutionResolver;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const records = new Map<string, TwsRecord>(
    input.previous.map((record) => [
      twsRecordId(record),
      {
        ...record,
        complete: false,
        presence: "unknown" as const,
        observationId: input.observationId,
      },
    ]),
  );
  let completeScopes = 0;
  let incompleteScopes = 0;
  const reportFailure = (scope: string) =>
    Effect.logWarning("TWS scope could not be confirmed.", { scope });
  const registryResult = yield* cli.probe({ refresh: true }).pipe(
    Effect.andThen(cli.checkRegistry()),
    Effect.tapError(() => reportFailure("registry")),
    Effect.option,
  );
  if (Option.isNone(registryResult))
    return {
      records: [...records.values()],
      completeScopes: 0,
      incompleteScopes: 1,
      status: "unavailable" as const,
    };
  const checks = registryResult.value;
  if (new Set(checks.map((check) => check.entry.id)).size !== checks.length)
    return yield* new TwsContextError({
      reason: "unavailable",
      message: "The TWS registry contains ambiguous identities.",
    });
  completeScopes++;
  const executions = new Map<string, Effect.Effect<Option.Option<TwsExecution>, never>>();
  const resolve = Effect.fn(function* (cwd: string) {
    let cached = executions.get(cwd);
    if (!cached) {
      cached = yield* Effect.cached(
        resolver.resolve(cwd).pipe(
          Effect.tapError(() => reportFailure("execution")),
          Effect.option,
        ),
      );
      executions.set(cwd, cached);
    }
    return Option.getOrNull(yield* cached);
  });
  const projects = yield* Effect.forEach(
    input.projects,
    Effect.fn(function* (project) {
      const execution = yield* resolve(project.workspaceRoot);
      if (!execution) incompleteScopes++;
      return { ...project, execution };
    }),
  );
  const missing = (record: TwsRecord): TwsRecord => {
    const evidence = {
      complete: true,
      presence: "missing" as const,
      observationId: input.observationId,
      missingObservations: [...new Set([...record.missingObservations, input.observationId])].slice(
        -2,
      ),
    };
    switch (record.kind) {
      case "workspace":
        return {
          ...record,
          ...evidence,
          binding: { ...record.binding, retiredAt: record.binding.retiredAt ?? input.observedAt },
        };
      case "feature":
        return {
          ...record,
          ...evidence,
          binding: { ...record.binding, retiredAt: record.binding.retiredAt ?? input.observedAt },
        };
      case "node":
        return {
          ...record,
          ...evidence,
          binding: { ...record.binding, retiredAt: record.binding.retiredAt ?? input.observedAt },
        };
    }
  };
  const seenRegistry = new Set(checks.map((check) => check.entry.id));
  for (const previous of input.previous) {
    if (previous.kind !== "workspace") continue;
    const registry = previous.binding.locators.find((locator) => locator.kind === "registry-entry");
    if (registry && !seenRegistry.has(registry.value)) {
      for (const row of input.previous.filter(
        (row) => row.workspaceBindingId === previous.workspaceBindingId,
      ))
        records.set(twsRecordId(row), missing(row));
    }
  }
  for (const check of checks) {
    if (check.entry.kind === "repo" && check.status === "ok") continue;
    if (
      check.status !== "ok" ||
      !["checkout-workspace", "external-workspace"].includes(check.entry.kind)
    ) {
      incompleteScopes++;
      yield* reportFailure("workspace-registry");
      continue;
    }
    const entry = check.entry;
    const statusResult = yield* cli.readStatus({ cwd: entry.path }).pipe(
      Effect.tapError(() => reportFailure("workspace")),
      Effect.option,
    );
    const normalized = Option.isSome(statusResult) ? normalizeTwsStatus(statusResult.value) : null;
    const canonicalPath = yield* fs.realPath(entry.path).pipe(Effect.option);
    if (!normalized || Option.isNone(canonicalPath)) {
      incompleteScopes++;
      yield* reportFailure("workspace-report");
      continue;
    }
    const reportedLocation =
      normalized.mode === "external" ? normalized.metadataRoot : normalized.repoRoot;
    const reportedPath =
      reportedLocation === null
        ? Option.none<string>()
        : yield* fs.realPath(reportedLocation).pipe(Effect.option);
    if (
      Option.isNone(reportedPath) ||
      reportedPath.value !== canonicalPath.value ||
      (normalized.mode === "checkout") !== (entry.kind === "checkout-workspace")
    ) {
      incompleteScopes++;
      yield* reportFailure("workspace-scope");
      continue;
    }
    const identityKey = encodeIdentityKey([entry.id, entry.markerId, canonicalPath.value]);
    const priorRecord = input.previous.find(
      (record) => record.kind === "workspace" && record.identityKey === identityKey,
    );
    let prior: TwsWorkspaceBinding | undefined =
      priorRecord?.kind === "workspace" ? priorRecord.binding : undefined;
    let requiresConfirmation = priorRecord?.requiresConfirmation ?? false;
    const marker = { kind: "stable-id" as const, value: `tws-marker:${entry.markerId}` };
    if (!prior && entry.markerId) {
      const matches = yield* bindings.findWorkspacesByLocator({
        environmentId: input.environmentId,
        locator: marker,
        limit: 2,
        includeRetired: true,
      });
      if (matches.length > 1) {
        incompleteScopes++;
        yield* reportFailure("workspace-identity");
        continue;
      }
      prior = matches[0];
      requiresConfirmation ||= input.previous.some(
        (record) =>
          record.kind === "workspace" &&
          record.binding.workspaceBindingId === prior?.workspaceBindingId &&
          record.requiresConfirmation,
      );
    }
    if (!prior) {
      const byRegistry = yield* bindings.findWorkspacesByLocator({
        environmentId: input.environmentId,
        locator: { kind: "registry-entry", value: entry.id },
        limit: 2,
        includeRetired: true,
      });
      const byPath = yield* bindings.findWorkspacesByLocator({
        environmentId: input.environmentId,
        locator: { kind: "path", value: canonicalPath.value },
        limit: 2,
        includeRetired: true,
      });
      requiresConfirmation = byRegistry.length > 0 || byPath.length > 0;
    }
    const workspaceBindingId =
      prior?.workspaceBindingId ?? TwsWorkspaceBindingId.make(NodeCrypto.randomUUID());
    const canonicalLocator = entry.markerId
      ? marker
      : { kind: "registry-entry" as const, value: entry.id };
    const binding: TwsWorkspaceBinding = {
      workspaceBindingId,
      environmentId: input.environmentId,
      canonicalLocator,
      locators: mergeTwsLocators(
        canonicalLocator,
        [
          { kind: "registry-entry", value: entry.id },
          { kind: "path", value: canonicalPath.value },
        ],
        prior?.locators ?? [],
      ),
      repositoryIdentity: prior?.repositoryIdentity ?? null,
      firstSeenAt: prior?.firstSeenAt ?? input.observedAt,
      lastSeenAt: input.observedAt,
      retiredAt: null,
    };
    const execution = normalized.repoRoot === null ? null : yield* resolve(normalized.repoRoot);
    const projectIds = projects
      .filter(
        (project) => execution && project.execution?.commonDirectory === execution.commonDirectory,
      )
      .map((project) => project.projectId);
    const metadata = {
      workspaceBindingId,
      complete: normalized.complete,
      requiresConfirmation,
      presence: "present" as const,
      observationId: input.observationId,
      lastConfirmedAt: input.observedAt,
      missingObservations: [],
    };
    records.set(workspaceBindingId, {
      ...metadata,
      kind: "workspace",
      binding,
      execution,
      projectIds,
      identityKey,
      label: (entry.aliases[0] || path.basename(canonicalPath.value) || entry.id).slice(0, 256),
    });
    if (normalized.complete) {
      for (const oldWorkspace of input.previous) {
        if (
          oldWorkspace.kind !== "workspace" ||
          oldWorkspace.workspaceBindingId === workspaceBindingId ||
          !oldWorkspace.binding.locators.some(
            (locator) => locator.kind === "registry-entry" && locator.value === entry.id,
          )
        )
          continue;
        for (const row of input.previous.filter(
          (record) => record.workspaceBindingId === oldWorkspace.workspaceBindingId,
        ))
          records.set(twsRecordId(row), missing(row));
      }
    }
    if (normalized.complete) completeScopes++;
    else incompleteScopes++;
    const featureNames = new Set(normalized.features.map((feature) => feature.name));
    for (const feature of normalized.features) {
      const matches = yield* bindings.findFeaturesByLocator({
        environmentId: input.environmentId,
        workspaceBindingId,
        locator: { kind: "name", value: feature.name },
        includeRetired: true,
        limit: 2,
      });
      if (matches.length > 1) {
        incompleteScopes++;
        yield* reportFailure("feature-identity");
        continue;
      }
      const old = matches[0];
      const featureBindingId =
        old?.featureBindingId ?? TwsFeatureBindingId.make(NodeCrypto.randomUUID());
      const locator = { kind: "name" as const, value: feature.name };
      const featureBinding = {
        featureBindingId,
        workspaceBindingId,
        environmentId: input.environmentId,
        canonicalLocator: locator,
        locators: mergeTwsLocators(
          locator,
          [{ kind: "path", value: feature.path }],
          old?.locators ?? [],
        ),
        repositoryIdentity: old?.repositoryIdentity ?? null,
        firstSeenAt: old?.firstSeenAt ?? input.observedAt,
        lastSeenAt: input.observedAt,
        retiredAt: null,
      };
      const stackResult = feature.complete
        ? yield* cli.readStackStatus({ cwd: entry.path, feature: feature.name }).pipe(
            Effect.tapError(() => reportFailure("feature")),
            Effect.option,
          )
        : Option.none();
      const nodes = Option.isSome(stackResult)
        ? normalizeTwsStack(normalized, feature, stackResult.value)
        : null;
      const nodeRecords: TwsRecord[] = [];
      let featureComplete = nodes !== null;
      for (const node of nodes ?? []) {
        const nodeMatches = yield* bindings.findStackNodesByLocator({
          environmentId: input.environmentId,
          featureBindingId,
          locator: { kind: "name", value: node.name },
          includeRetired: true,
          limit: 2,
        });
        if (nodeMatches.length > 1) {
          featureComplete = false;
          continue;
        }
        const oldNode = nodeMatches[0];
        const nodeExecution =
          node.executionPath === null ? null : yield* resolve(node.executionPath);
        if (
          node.executionPath !== null &&
          (nodeExecution === null ||
            nodeExecution.path !== nodeExecution.root ||
            nodeExecution.branch !== node.gitBranch ||
            nodeExecution.commonDirectory !== execution?.commonDirectory)
        )
          featureComplete = false;
        const validExecution =
          nodeExecution !== null &&
          nodeExecution.path === nodeExecution.root &&
          nodeExecution.branch === node.gitBranch &&
          nodeExecution.commonDirectory === execution?.commonDirectory
            ? nodeExecution
            : null;
        const stackNodeBindingId =
          oldNode?.stackNodeBindingId ?? TwsStackNodeBindingId.make(NodeCrypto.randomUUID());
        const nodeLocator = { kind: "name" as const, value: node.name };
        nodeRecords.push({
          ...metadata,
          kind: "node",
          label: node.name,
          execution: validExecution,
          complete: featureComplete,
          binding: {
            stackNodeBindingId,
            featureBindingId,
            projectId: projectIds.length === 1 ? projectIds[0]! : null,
            environmentId: input.environmentId,
            canonicalLocator: nodeLocator,
            locators: mergeTwsLocators(
              nodeLocator,
              [
                { kind: "git-branch", value: node.gitBranch },
                ...(node.executionPath
                  ? [{ kind: "path" as const, value: node.executionPath }]
                  : []),
              ],
              oldNode?.locators ?? [],
            ),
            repositoryIdentity: oldNode?.repositoryIdentity ?? null,
            gitBranch: node.gitBranch,
            worktreePath: validExecution?.root ?? null,
            archived: node.archived,
            firstSeenAt: oldNode?.firstSeenAt ?? input.observedAt,
            lastSeenAt: input.observedAt,
            retiredAt: null,
          },
        });
      }
      records.set(featureBindingId, {
        ...metadata,
        kind: "feature",
        binding: featureBinding,
        label: feature.name,
        complete: featureComplete,
      });
      for (const record of nodeRecords)
        records.set(twsRecordId(record), { ...record, complete: featureComplete });
      if (featureComplete) {
        completeScopes++;
        const nodeIds = new Set(nodeRecords.map(twsRecordId));
        for (const oldRecord of input.previous) {
          if (
            oldRecord.kind === "node" &&
            oldRecord.binding.featureBindingId === featureBindingId &&
            !nodeIds.has(twsRecordId(oldRecord))
          )
            records.set(twsRecordId(oldRecord), missing(oldRecord));
        }
      } else {
        incompleteScopes++;
        yield* reportFailure("feature-coverage");
      }
    }
    if (normalized.complete) {
      for (const oldRecord of input.previous) {
        if (oldRecord.workspaceBindingId !== workspaceBindingId || oldRecord.kind === "workspace")
          continue;
        const oldFeature =
          oldRecord.kind === "feature"
            ? oldRecord
            : input.previous.find(
                (record) =>
                  record.kind === "feature" &&
                  record.binding.featureBindingId === oldRecord.binding.featureBindingId,
              );
        if (oldFeature && !featureNames.has(oldFeature.label))
          records.set(twsRecordId(oldRecord), missing(oldRecord));
      }
    }
  }
  return {
    records: [...records.values()],
    completeScopes,
    incompleteScopes,
    status: incompleteScopes > 0 ? ("degraded" as const) : ("ready" as const),
  };
});
