import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { symlinksSupported } from "@t3tools/shared/testing/symlinks";
import type { BuildArch, BuildPlatform } from "./build-target-arch.ts";
import {
  COPILOT_DEPENDENCY_OVERRIDES,
  pruneCopilotSdkServerPayload,
  resolveCopilotDependencyClosure,
} from "./copilot-payload.ts";

const encodeJson = Schema.encodeSync(Schema.fromJsonString(Schema.Unknown));
const dependencies = { "@github/copilot-sdk": "1.0.28" };
const targets = [
  {
    platform: "win",
    arch: "x64",
    target: "win32-x64",
    suffix: "-msvc",
    recorder: "windows/amd64",
    removed: 0,
  },
  {
    platform: "win",
    arch: "arm64",
    target: "win32-arm64",
    suffix: "-msvc",
    recorder: "windows/arm64",
    foreign: "win32-x64",
    removed: 2,
  },
  {
    platform: "linux",
    arch: "x64",
    target: "linux-x64",
    suffix: "-gnu",
    recorder: "linux/x86_64",
    removed: 1,
  },
  {
    platform: "linux",
    arch: "arm64",
    target: "linux-arm64",
    suffix: "-gnu",
    foreign: "linux-x64",
    removed: 3,
  },
  {
    platform: "mac",
    arch: "arm64",
    target: "darwin-arm64",
    suffix: "",
    recorder: "mac/arm64",
    removed: 0,
  },
  {
    platform: "mac",
    arch: "x64",
    target: "darwin-x64",
    suffix: "",
    recorder: "mac/x86_64",
    foreign: "darwin-arm64",
    removed: 2,
  },
] as const;

const makeStage = Effect.fn("test.makeCopilotPayloadStage")(function* (
  platform: BuildPlatform,
  arch: BuildArch,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const stageDir = yield* fs.makeTempDirectoryScoped({ prefix: "t3-copilot-payload-" });
  const write = Effect.fn("test.writeCopilotPayload")(function* (
    relative: string,
    text = relative,
  ) {
    const file = path.join(stageDir, relative);
    yield* fs.makeDirectory(path.dirname(file), { recursive: true });
    yield* fs.writeFileString(file, text);
    return file;
  });
  yield* write("package.json", encodeJson({ name: "stage", private: true, dependencies }));
  for (const [name, version] of [
    ["@github/copilot-sdk", "1.0.28"],
    ["koffi", "3.3.1"],
    ["vscode-jsonrpc", "8.2.1"],
    ["zod", "4.4.3"],
  ]) {
    yield* write(
      `node_modules/${name}/package.json`,
      encodeJson({ name, version, main: "index.js" }),
    );
    yield* write(`node_modules/${name}/index.js`, "module.exports = {};");
  }
  const retained: string[] = [];
  const removed: string[] = [];
  for (const target of targets.filter(
    (target) => target.platform === platform && (arch === "universal" || target.arch === arch),
  )) {
    const root = `node_modules/@github/copilot-sdk-${target.target}`;
    const exe = platform === "win" ? ".exe" : "";
    yield* write(
      `${root}/package.json`,
      encodeJson({
        name: `@github/copilot-sdk-${target.target}`,
        version: "1.0.28",
      }),
    );
    for (const file of [
      `prebuilds/${target.target}/copilot-runtime${exe}`,
      `prebuilds/${target.target}/runtime.node`,
      `ripgrep/bin/${target.target}/rg${exe}`,
      `tgrep/bin/${target.target}/tgrep${exe}`,
      ...(platform === "mac" || platform === "win"
        ? [`prebuilds/${target.target}/msal-node-runtime.node`]
        : []),
      ...(platform === "mac"
        ? [
            `prebuilds/${target.target}/libmsalruntime_${target.arch}.dylib`,
            `prebuilds/${target.target}/libOneAuthInterop.dylib`,
          ]
        : []),
      ...(platform === "win"
        ? [
            `prebuilds/${target.target}/dpapi.node`,
            `prebuilds/${target.target}/msalruntime${target.arch === "arm64" ? "_arm64" : ""}.dll`,
            `prebuilds/${target.target}/OneAuthInterop.dll`,
            "plugins/computer-use/computer-use-mcp.exe",
            "plugins/computer-use/CopilotComputerUse.exe",
          ]
        : []),
    ])
      retained.push(yield* write(`${root}/${file}`));
    if ("foreign" in target) {
      removed.push(yield* write(`${root}/ripgrep/bin/${target.foreign}/rg${exe}`));
      removed.push(yield* write(`${root}/tgrep/bin/${target.foreign}/tgrep${exe}`));
    }
    const binding = `node_modules/@koromix/koffi-${target.target}`;
    yield* write(
      `${binding}/package.json`,
      encodeJson({ name: `@koromix/koffi-${target.target}`, version: "3.3.1" }),
    );
    retained.push(yield* write(`${binding}/${target.target.replace("-", "_")}/koffi.node`));
    if (platform === "linux")
      removed.push(yield* write(`${binding}/musl_${target.arch}/koffi.node`));
  }
  return { stageDir, retained, removed, write, overrides: COPILOT_DEPENDENCY_OVERRIDES };
});

it.layer(NodeServices.layer)("reviewed Copilot payload", (it) => {
  it.effect("rejects missing overrides and SDK anchor drift before pruning", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const stage = yield* makeStage("win", "x64");
        for (const selector of Object.keys(COPILOT_DEPENDENCY_OVERRIDES)) {
          for (const drift of [undefined, "99.0.0"]) {
            const overrides: Record<string, string> = { ...stage.overrides };
            if (drift === undefined) delete overrides[selector];
            else overrides[selector] = drift;
            const error = yield* pruneCopilotSdkServerPayload({
              ...stage,
              platform: "win",
              arch: "x64",
              dependencies,
              overrides,
            }).pipe(Effect.flip);
            assert.include(error.message, `workspace override ${selector}`);
          }
        }
        const error = yield* resolveCopilotDependencyClosure({
          ...stage,
          dependencies: { "@github/copilot-sdk": "^1.0.8" },
        }).pipe(Effect.flip);
        assert.include(error.message, "SDK dependency must be exactly");
        for (const file of stage.removed) assert.isTrue(yield* fs.exists(file));
      }),
    ),
  );

  it.effect.each([
    ["koffi", "3.3.1", "@github/copilot-sdk"],
    ["vscode-jsonrpc", "8.2.1", "@github/copilot-sdk"],
    ["zod", "4.4.3", "@github/copilot-sdk"],
  ] as const)(
    "refuses missing or owner-local drift in %s, despite a correct root copy",
    ([name, version, owner]) =>
      Effect.scoped(
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const stage = yield* makeStage("win", "x64");
          const ownerPath = `node_modules/${owner}/node_modules/${name}`;
          yield* stage.write(`${ownerPath}/package.json`, encodeJson({ name, version: "99.0.0" }));
          const drift = yield* pruneCopilotSdkServerPayload({
            ...stage,
            platform: "win",
            arch: "x64",
            dependencies,
          }).pipe(Effect.flip);
          assert.include(drift.message, `unreviewed ${name} version 99.0.0`);
          yield* stage.write(`${ownerPath}/package.json`, encodeJson({ name, version }));
          assert.isNotNull(yield* resolveCopilotDependencyClosure({ ...stage, dependencies }));
          yield* fs.remove(`${stage.stageDir}/${ownerPath}`, { recursive: true });
          yield* fs.remove(`${stage.stageDir}/node_modules/${name}`, { recursive: true });
          const missing = yield* resolveCopilotDependencyClosure({ ...stage, dependencies }).pipe(
            Effect.flip,
          );
          assert.include(missing.message, name);
          assert.match(missing.message, /cannot resolve|missing or unreadable/);
          for (const file of stage.removed) assert.isTrue(yield* fs.exists(file));
        }),
      ),
  );

  it.effect.skipIf(!symlinksSupported)(
    "resolves strict in-stage owner links and refuses escaping transitives",
    () =>
      Effect.scoped(
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;
          for (const escape of [false, true]) {
            const stage = yield* makeStage("win", "x64");
            const sdk = path.join(stage.stageDir, "node_modules/@github/copilot-sdk");
            const physical = path.join(
              stage.stageDir,
              "node_modules/.pnpm/sdk/node_modules/@github/copilot-sdk",
            );
            yield* fs.makeDirectory(path.dirname(physical), { recursive: true });
            yield* fs.rename(sdk, physical);
            yield* fs.symlink(physical, sdk);
            if (escape) {
              const outside = yield* fs.makeTempDirectoryScoped({
                prefix: "t3-copilot-transitive-",
              });
              yield* fs.writeFileString(
                path.join(outside, "package.json"),
                encodeJson({ name: "zod", version: "4.4.3" }),
              );
              yield* fs.makeDirectory(path.join(physical, "node_modules"), { recursive: true });
              yield* fs.symlink(outside, path.join(physical, "node_modules/zod"));
              const error = yield* resolveCopilotDependencyClosure({ ...stage, dependencies }).pipe(
                Effect.flip,
              );
              assert.include(error.message, "outside the stage");
            } else {
              assert.isNotNull(yield* resolveCopilotDependencyClosure({ ...stage, dependencies }));
            }
          }
        }),
      ),
  );

  it.effect.each(targets)(
    "preserves $target runtime bytes and removes exactly $removed unreachable natives",
    (target) =>
      Effect.scoped(
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const stage = yield* makeStage(target.platform, target.arch);
          const result = yield* pruneCopilotSdkServerPayload({
            ...stage,
            platform: target.platform,
            arch: target.arch,
            dependencies,
          });
          assert.equal(result.pruned, true);
          assert.lengthOf(result.removedNativeFiles, target.removed);
          for (const file of stage.retained)
            assert.equal(
              yield* fs.readFileString(file),
              file.slice(stage.stageDir.length + 1).replaceAll("\\", "/"),
            );
          for (const file of stage.removed) assert.isFalse(yield* fs.exists(file));
          const second = yield* pruneCopilotSdkServerPayload({
            ...stage,
            platform: target.platform,
            arch: target.arch,
            dependencies,
          });
          assert.deepEqual(second.removedNativeFiles, []);
        }),
      ),
  );
  it.effect("retains both target architectures for universal macOS", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const stage = yield* makeStage("mac", "universal");
        const result = yield* pruneCopilotSdkServerPayload({
          ...stage,
          platform: "mac",
          arch: "universal",
          dependencies,
        });
        assert.lengthOf(result.removedNativeFiles, 2);
        for (const file of stage.retained) assert.isTrue(yield* fs.exists(file));
      }),
    ),
  );
  it.effect("leaves stages that do not declare Copilot untouched", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const stage = yield* makeStage("win", "x64");
        const result = yield* pruneCopilotSdkServerPayload({
          ...stage,
          platform: "win",
          arch: "x64",
          dependencies: {},
          overrides: {},
        });
        assert.deepEqual(result, { pruned: false, removedNativeFiles: [] });
        for (const file of stage.removed) assert.isTrue(yield* fs.exists(file));
      }),
    ),
  );
  it.effect.each([
    "sdk-version",
    "platform-version",
    "koffi-version",
    "missing-required",
    "unexpected-native",
    "partial-prune",
    "foreign-package",
    "foreign-koffi",
    "missing-sdk",
    "missing-runtime-library",
  ] as const)("refuses %s before deleting any remaining files", (fault) =>
    Effect.scoped(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const stage = yield* makeStage("win", "x64");
        switch (fault) {
          case "sdk-version":
            yield* stage.write(
              "node_modules/@github/copilot-sdk/package.json",
              encodeJson({ name: "@github/copilot-sdk", version: "1.0.9", main: "index.js" }),
            );
            break;
          case "platform-version":
            yield* stage.write(
              "node_modules/@github/copilot-sdk-win32-x64/package.json",
              encodeJson({
                name: "@github/copilot-sdk-win32-x64",
                version: "99.0.0",
              }),
            );
            break;
          case "koffi-version":
            yield* stage.write(
              "node_modules/koffi/package.json",
              encodeJson({ name: "koffi", version: "99.0.0" }),
            );
            break;
          case "missing-required":
            yield* fs.remove(stage.retained[0]!);
            break;
          case "unexpected-native":
            yield* stage.write("node_modules/@github/copilot-sdk-win32-x64/unreviewed.node");
            break;
          case "partial-prune":
            yield* stage.write(
              "node_modules/@github/copilot-sdk-win32-x64/ripgrep/bin/win32-arm64/rg.exe",
            );
            break;
          case "foreign-package":
            yield* stage.write(
              "node_modules/@github/copilot-sdk-linux-x64/package.json",
              encodeJson({
                name: "@github/copilot-sdk-linux-x64",
                version: "1.0.28",
              }),
            );
            break;
          case "missing-sdk":
            yield* fs.remove(`${stage.stageDir}/node_modules/@github/copilot-sdk/package.json`);
            break;
          case "foreign-koffi":
            yield* stage.write(
              "node_modules/@koromix/koffi-linux-x64/package.json",
              encodeJson({ name: "@koromix/koffi-linux-x64", version: "3.3.1" }),
            );
            yield* stage.write("node_modules/@koromix/koffi-linux-x64/linux_x64/koffi.node");
            break;
          case "missing-runtime-library":
            yield* fs.remove(
              `${stage.stageDir}/node_modules/@github/copilot-sdk-win32-x64/prebuilds/win32-x64/runtime.node`,
            );
            break;
        }
        const result = yield* Effect.flip(
          pruneCopilotSdkServerPayload({ ...stage, platform: "win", arch: "x64", dependencies }),
        );
        assert.equal(result._tag, "CopilotPayloadError");
        for (const file of fault === "partial-prune" ? stage.removed.slice(1) : stage.removed) {
          assert.isTrue(yield* fs.exists(file));
        }
      }),
    ),
  );
  it.effect("validates every universal target before removing the first architecture", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const stage = yield* makeStage("mac", "universal");
        yield* fs.remove(
          `${stage.stageDir}/node_modules/@github/copilot-sdk-darwin-x64/prebuilds/darwin-x64/copilot-runtime`,
        );
        const error = yield* Effect.flip(
          pruneCopilotSdkServerPayload({
            ...stage,
            platform: "mac",
            arch: "universal",
            dependencies,
          }),
        );
        assert.equal(error._tag, "CopilotPayloadError");
        for (const file of stage.removed) assert.isTrue(yield* fs.exists(file));
      }),
    ),
  );
  it.effect.skipIf(!symlinksSupported)(
    "refuses an out-of-stage symlink without touching its target",
    () =>
      Effect.scoped(
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;
          const stage = yield* makeStage("win", "x64");
          const outside = yield* fs.makeTempDirectoryScoped({ prefix: "t3-copilot-outside-" });
          const outsideFile = path.join(outside, "keep.node");
          yield* fs.writeFileString(outsideFile, "untouched");
          yield* fs.symlink(
            outsideFile,
            path.join(stage.stageDir, "node_modules/@github/copilot-sdk-win32-x64/escape.node"),
          );
          const error = yield* Effect.flip(
            pruneCopilotSdkServerPayload({ ...stage, platform: "win", arch: "x64", dependencies }),
          );
          assert.equal(error._tag, "CopilotPayloadError");
          assert.equal(yield* fs.readFileString(outsideFile), "untouched");
          for (const file of stage.removed) assert.isTrue(yield* fs.exists(file));
        }),
      ),
  );
});
