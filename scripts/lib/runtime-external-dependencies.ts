// @effect-diagnostics nodeBuiltinImport:off
import * as NodeFS from "node:fs";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import { fromYaml } from "@t3tools/shared/schemaYaml";
import { selectCliRuntimeExternalDependencies } from "./cli-external-packages.ts";
import { resolveCatalogDependencies } from "./resolve-catalog.ts";

const Workspace = Schema.Struct({
  packages: Schema.Array(Schema.String),
  catalog: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});
const Manifest = Schema.Struct({
  name: Schema.String,
  dependencies: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  optionalDependencies: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});
const decodeManifest = Schema.decodeEffect(Schema.fromJsonString(Manifest));

export class RuntimeExternalDependencyError extends Schema.TaggedError<RuntimeExternalDependencyError>()(
  "RuntimeExternalDependencyError",
  { detail: Schema.String, cause: Schema.optional(Schema.Defect()) },
) {}

/** Follow workspace owners because provider dependencies no longer live in the server manifest. */
export const collectCliRuntimeExternalDependencies = Effect.fn(
  "collectCliRuntimeExternalDependencies",
)(function* (repoRoot: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const workspace = yield* Schema.decodeEffect(fromYaml(Workspace))(
    yield* fs.readFileString(path.join(repoRoot, "pnpm-workspace.yaml")),
  );
  const manifestPaths = yield* Effect.try({
    try: () =>
      NodeFS.globSync(
        workspace.packages.map((pattern) => `${pattern}/package.json`),
        { cwd: repoRoot },
      ),
    catch: (cause) =>
      new RuntimeExternalDependencyError({
        detail: "Could not enumerate workspace owners.",
        cause,
      }),
  });
  const owners = new Map<string, { manifest: typeof Manifest.Type; file: string }>();
  for (const file of manifestPaths.sort()) {
    const manifest = yield* decodeManifest(yield* fs.readFileString(path.join(repoRoot, file)));
    if (owners.has(manifest.name)) {
      return yield* new RuntimeExternalDependencyError({
        detail: `Duplicate workspace owner ${manifest.name}.`,
      });
    }
    owners.set(manifest.name, { manifest, file });
  }
  const serverFile = "apps/server/package.json";
  const server = yield* decodeManifest(yield* fs.readFileString(path.join(repoRoot, serverFile)));
  const queue = [{ manifest: server, file: serverFile }];
  const visited = new Set<string>();
  const dependencies: Record<string, string> = {};
  const selectedOwners = new Map<string, string>();
  for (const owner of queue) {
    if (visited.has(owner.manifest.name)) continue;
    visited.add(owner.manifest.name);
    const declared = {
      ...owner.manifest.dependencies,
      ...owner.manifest.optionalDependencies,
    };
    for (const [name, spec] of Object.entries(declared)) {
      if (!spec.startsWith("workspace:")) continue;
      const child = owners.get(name);
      if (!child) {
        return yield* new RuntimeExternalDependencyError({
          detail: `${owner.file} requires missing workspace owner ${name}.`,
        });
      }
      queue.push(child);
    }
    const resolved = resolveCatalogDependencies(declared, workspace.catalog ?? {}, owner.file);
    for (const [name, version] of Object.entries(selectCliRuntimeExternalDependencies(resolved))) {
      if (version.startsWith("workspace:")) continue;
      if (dependencies[name] !== undefined && dependencies[name] !== version) {
        return yield* new RuntimeExternalDependencyError({
          detail: `Cannot flatten ${name}: ${selectedOwners.get(name)} requires ${dependencies[name]}, but ${owner.file} requires ${version}.`,
        });
      }
      dependencies[name] = version;
      selectedOwners.set(name, owner.file);
    }
  }
  return dependencies;
});
