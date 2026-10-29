import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import {
  collectCliRuntimeExternalDependencies,
  RuntimeExternalDependencyError,
} from "./runtime-external-dependencies.ts";

const fixture = Effect.fn("test.runtimeOwners")(function* (conflict = false, missing = false) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* fs.makeTempDirectoryScoped({ prefix: "t3-runtime-owners-" });
  yield* fs.writeFileString(
    path.join(root, "pnpm-workspace.yaml"),
    'packages: ["apps/*", "packages/*"]\ncatalog:\n  node-pty: 1.2.0-beta.15\n',
  );
  for (const [directory, manifest] of Object.entries({
    "apps/server": { name: "t3", dependencies: { "@test/provider": "workspace:*" } },
    "packages/provider": {
      name: "@test/provider",
      dependencies: {
        "@test/helper": "workspace:*",
        "node-pty": "catalog:",
        effect: "4.0.5",
      },
    },
    "packages/helper": {
      name: "@test/helper",
      dependencies: {
        "@test/provider": "workspace:*",
        ...(missing ? { "@test/missing": "workspace:*" } : {}),
        ...(conflict ? { "node-pty": "different" } : { "playwright-core": "1.58.2" }),
      },
    },
    "packages/unreachable": { name: "@test/unreachable", dependencies: { "node-pty": "wrong" } },
  })) {
    yield* fs.makeDirectory(path.join(root, directory), { recursive: true });
    yield* fs.writeFileString(path.join(root, directory, "package.json"), JSON.stringify(manifest));
  }
  return root;
});

it.layer(NodeServices.layer)("workspace-owned runtime externals", (it) => {
  it.effect(
    "stages the reachable owner closure, resolving catalogs and cycles without unrelated packages",
    () =>
      Effect.gen(function* () {
        const root = yield* fixture();
        assert.deepStrictEqual(yield* collectCliRuntimeExternalDependencies(root), {
          "node-pty": "1.2.0-beta.15",
          "playwright-core": "1.58.2",
        });
      }),
  );
  it.effect.each([
    [true, false],
    [false, true],
  ] as const)(
    "refuses incompatible flattened owners or missing workspace edges (%s, %s)",
    ([conflict, missing]) =>
      Effect.gen(function* () {
        const root = yield* fixture(conflict, missing);
        const error = yield* collectCliRuntimeExternalDependencies(root).pipe(Effect.flip);
        assert.instanceOf(error, RuntimeExternalDependencyError);
        assert.include(
          error.detail,
          conflict ? "Cannot flatten node-pty" : "missing workspace owner",
        );
      }),
  );
});
