import * as Schema from "effect/Schema";
import * as Option from "effect/Option";
import type { TwsStackStatusReport, TwsStatusReport } from "./TwsCliDecoder.ts";

const Label = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(256));
const LocalPath = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(4096));
const StatusEnvelope = Schema.Struct({
  schema_version: Schema.Literal(1),
  workspace: Schema.Struct({
    mode: Schema.Literals(["checkout", "external"]),
    repo_root: Schema.NullOr(LocalPath),
    metadata_root: LocalPath,
    degraded: Schema.Boolean,
  }),
  features: Schema.Array(Schema.Unknown),
  summary: Schema.Struct({ features: Schema.Int, entries: Schema.Int }),
});
const Feature = Schema.Struct({
  feature: Label,
  path: LocalPath,
  stack_state: Schema.String,
  entries: Schema.Array(Schema.Struct({ name: Label, git_branch: Label })),
});
const StackEnvelope = Schema.Struct({
  schema_version: Schema.Literal(1),
  feature: Label,
  workspace: Schema.Struct({
    mode: Schema.Literals(["checkout", "external"]),
    metadata_root: LocalPath,
    repository: Schema.Struct({ dir: Schema.NullOr(LocalPath) }),
    checkout: Schema.NullOr(
      Schema.Struct({
        path: Schema.NullOr(LocalPath),
        branch: Schema.NullOr(Label),
        detached: Schema.NullOr(Schema.Boolean),
      }),
    ),
  }),
  entries: Schema.Array(
    Schema.Struct({
      name: Label,
      git_branch: Label,
      archived: Schema.Boolean,
      repo: Schema.NullOr(Label),
      ref_exists: Schema.NullOr(Schema.Boolean),
      is_current_checkout: Schema.NullOr(Schema.Boolean),
      materialization: Schema.Struct({
        kind: Schema.Literals(["ref", "worktree"]),
        state: Schema.Literals([
          "present",
          "archived",
          "missing",
          "prunable-missing",
          "cross-repo-unsupported",
          "unknown",
        ]),
        path: Schema.NullOr(LocalPath),
        checked_out_branch: Schema.NullOr(Label),
        detached: Schema.NullOr(Schema.Boolean),
      }),
    }),
  ),
  summary: Schema.Struct({ entries: Schema.Int }),
});
const decodeStatus = Schema.decodeUnknownOption(StatusEnvelope);
const decodeFeature = Schema.decodeUnknownOption(Feature);
const decodeStack = Schema.decodeUnknownOption(StackEnvelope);

export interface TwsFeatureObservation {
  readonly name: string;
  readonly path: string;
  readonly entries: ReadonlyArray<{ readonly name: string; readonly gitBranch: string }>;
  readonly complete: boolean;
}
export interface TwsWorkspaceObservation {
  readonly mode: "checkout" | "external";
  readonly repoRoot: string | null;
  readonly metadataRoot: string;
  readonly features: ReadonlyArray<TwsFeatureObservation>;
  readonly complete: boolean;
}
export interface TwsNodeObservation {
  readonly name: string;
  readonly gitBranch: string;
  readonly archived: boolean;
  readonly executionPath: string | null;
}

/** Normalize only public association fields; runtime/agent status never establishes context. */
export function normalizeTwsStatus(report: TwsStatusReport): TwsWorkspaceObservation | null {
  const decoded = decodeStatus(report.raw);
  if (Option.isNone(decoded)) return null;
  const value = decoded.value;
  const features: TwsFeatureObservation[] = [];
  let complete = !value.workspace.degraded && value.summary.features === value.features.length;
  let entries = 0;
  const names = new Set<string>();
  const duplicates = new Set<string>();
  for (const raw of value.features) {
    const parsed = decodeFeature(raw);
    if (Option.isNone(parsed)) {
      complete = false;
      continue;
    }
    const feature = parsed.value;
    entries += feature.entries.length;
    if (names.has(feature.feature)) {
      complete = false;
      duplicates.add(feature.feature);
      continue;
    }
    names.add(feature.feature);
    features.push({
      name: feature.feature,
      path: feature.path,
      entries: feature.entries.map((entry) => ({ name: entry.name, gitBranch: entry.git_branch })),
      complete:
        feature.stack_state === "ok" &&
        new Set(feature.entries.map((entry) => entry.name)).size === feature.entries.length,
    });
  }
  return {
    mode: value.workspace.mode,
    repoRoot: value.workspace.repo_root,
    metadataRoot: value.workspace.metadata_root,
    features: features.map((feature) =>
      duplicates.has(feature.name) ? { ...feature, complete: false } : feature,
    ),
    complete: complete && entries === value.summary.entries,
  };
}

export function normalizeTwsStack(
  workspace: TwsWorkspaceObservation,
  feature: TwsFeatureObservation,
  report: TwsStackStatusReport,
): ReadonlyArray<TwsNodeObservation> | null {
  const decoded = decodeStack(report.raw);
  if (Option.isNone(decoded) || !feature.complete) return null;
  const value = decoded.value;
  if (
    value.feature !== feature.name ||
    value.workspace.mode !== workspace.mode ||
    value.workspace.metadata_root !== workspace.metadataRoot ||
    value.workspace.repository.dir !== workspace.repoRoot ||
    value.summary.entries !== value.entries.length ||
    value.entries.length !== feature.entries.length ||
    new Set(value.entries.map((entry) => entry.name)).size !== value.entries.length
  )
    return null;
  const expected = new Map(feature.entries.map((entry) => [entry.name, entry.gitBranch]));
  if (value.entries.some((entry) => expected.get(entry.name) !== entry.git_branch)) return null;
  return value.entries.map((entry) => {
    const materialization = entry.materialization;
    let executionPath: string | null = null;
    if (
      !entry.archived &&
      entry.repo === null &&
      entry.ref_exists === true &&
      materialization.state === "present"
    ) {
      if (
        materialization.kind === "worktree" &&
        materialization.detached === false &&
        materialization.checked_out_branch === entry.git_branch
      )
        executionPath = materialization.path;
      if (
        materialization.kind === "ref" &&
        entry.is_current_checkout === true &&
        value.workspace.checkout?.detached === false &&
        value.workspace.checkout.branch === entry.git_branch
      )
        executionPath = value.workspace.checkout.path;
    }
    return {
      name: entry.name,
      gitBranch: entry.git_branch,
      archived: entry.archived,
      executionPath,
    };
  });
}
