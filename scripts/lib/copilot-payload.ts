// @effect-diagnostics nodeBuiltinImport:off
import * as NodeModule from "node:module";

import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import type { BuildArch, BuildPlatform } from "./build-target-arch.ts";

export const COPILOT_PAYLOAD_VERSIONS = {
  sdk: "1.0.8",
  runtime: "1.0.75",
  koffi: "3.3.1",
} as const;

const PackageManifest = Schema.Struct({
  name: Schema.optional(Schema.String),
  version: Schema.optional(Schema.String),
});
const decodeManifest = Schema.decodeUnknownEffect(Schema.fromJsonString(PackageManifest));
const NATIVE_FILE = /\.(?:node|dll|exe|dylib|so(?:\.\d+)*)$/u;
const GENERIC_CLIPBOARD_TARGETS = [
  "darwin-arm64",
  "darwin-x64",
  "linux-arm64-gnu",
  "linux-x64-gnu",
  "win32-arm64-msvc",
  "win32-x64-msvc",
] as const;
const INTERACTIVE_DIRECTORIES = ["foundry-local-sdk", "pvrecorder", "webview"] as const;

export class CopilotPayloadError extends Schema.TaggedError<CopilotPayloadError>()(
  "CopilotPayloadError",
  { stageDir: Schema.String, detail: Schema.String, cause: Schema.optional(Schema.Defect()) },
) {
  override get message(): string {
    return `Copilot payload validation failed: ${this.detail}`;
  }
}

function resolvePackageEntry(loader: ReturnType<typeof NodeModule.createRequire>, name: string) {
  try {
    return loader.resolve(`${name}/package.json`);
  } catch (cause) {
    if (
      cause instanceof Error &&
      "code" in cause &&
      cause.code === "ERR_PACKAGE_PATH_NOT_EXPORTED"
    ) {
      return loader.resolve(name);
    }
    throw cause;
  }
}

function targetLayout(platform: BuildPlatform, arch: "x64" | "arm64") {
  const os = platform === "mac" ? "darwin" : platform === "win" ? "win32" : "linux";
  const target = `${os}-${arch}`;
  const suffix = os === "win32" ? "-msvc" : os === "linux" ? "-gnu" : "";
  const extension = os === "win32" ? ".exe" : "";
  const required = [
    `copilot${extension}`,
    `prebuilds/${target}/cli-native.node`,
    `prebuilds/${target}/runtime.node`,
    `ripgrep/bin/${target}/rg${extension}`,
    `tgrep/bin/${target}/tgrep${extension}`,
    `clipboard/node_modules/@teddyzhu/clipboard-${target}${suffix}/clipboard.${target}${suffix}.node`,
    ...(os === "win32"
      ? [
          `builtin-plugins/computer-use/0.1.71/${target}/computer-use-mcp.exe`,
          `builtin-plugins/computer-use/0.1.71/${target}/CopilotComputerUse.exe`,
        ]
      : []),
  ];
  const removed: string[] = GENERIC_CLIPBOARD_TARGETS.map(
    (name) => `clipboard/node_modules/@teddyzhu/clipboard/clipboard.${name}.node`,
  );
  if (!(os === "darwin" && arch === "x64")) {
    removed.push(
      `foundry-local-sdk/node_modules/foundry-local-sdk/prebuilds/${target}/foundry_local_napi.node`,
    );
  }
  if (!(os === "linux" && arch === "arm64")) {
    const recorderTarget =
      os === "win32"
        ? `windows/${arch === "x64" ? "amd64" : "arm64"}`
        : os === "darwin"
          ? `mac/${arch === "x64" ? "x86_64" : "arm64"}`
          : "linux/x86_64";
    removed.push(
      `pvrecorder/node_modules/@picovoice/pvrecorder-node/lib/${recorderTarget}/pv_recorder.node`,
    );
  }
  const webviewSuffix = os === "darwin" ? "" : suffix;
  removed.push(
    `webview/node_modules/@webviewjs/webview-${target}${webviewSuffix}/webview.${target}${webviewSuffix}.node`,
  );
  const foreignSearchTarget =
    os === "darwin" && arch === "x64"
      ? "darwin-arm64"
      : os !== "darwin" && arch === "arm64"
        ? `${os}-x64`
        : null;
  if (foreignSearchTarget) {
    removed.push(
      `ripgrep/bin/${foreignSearchTarget}/rg${extension}`,
      `tgrep/bin/${foreignSearchTarget}/tgrep${extension}`,
    );
  }
  return { target, os, arch, required, removed, foreignSearchTarget };
}

/**
 * Prune only a reviewed SDK-server payload in an isolated production stage.
 * Validate every target before deleting anything; never prune a package store
 * reached outside the stage through Node resolution or a symlink.
 */
export const pruneCopilotSdkServerPayload = Effect.fn("pruneCopilotSdkServerPayload")(
  function* (input: {
    readonly stageDir: string;
    readonly platform: BuildPlatform;
    readonly arch: BuildArch;
    readonly dependencies: Readonly<Record<string, string>>;
  }) {
    if (input.dependencies["@github/copilot-sdk"] === undefined) {
      return { pruned: false, removedNativeFiles: [] as ReadonlyArray<string> };
    }
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const failure = (detail: string, cause?: unknown) =>
      new CopilotPayloadError({
        stageDir: input.stageDir,
        detail,
        ...(cause === undefined ? {} : { cause }),
      });
    if (input.arch === "universal" && input.platform !== "mac") {
      return yield* failure("universal Copilot payloads are supported only on macOS");
    }
    const root = yield* fs.realPath(input.stageDir);
    const contained = (candidate: string) => {
      const relative = path.relative(root, candidate);
      return (
        relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
      );
    };
    const realInside = Effect.fn("copilotPayload.realInside")(function* (candidate: string) {
      const real = yield* fs
        .realPath(candidate)
        .pipe(
          Effect.mapError((cause) =>
            failure(`missing or unreadable staged path ${candidate}`, cause),
          ),
        );
      if (!contained(real)) return yield* failure(`path resolves outside the stage: ${candidate}`);
      return real;
    });
    const resolvePackage = Effect.fn("copilotPayload.resolvePackage")(function* (
      loader: ReturnType<typeof NodeModule.createRequire>,
      name: string,
      version: string,
    ) {
      const entry = yield* Effect.try({
        try: () => resolvePackageEntry(loader, name),
        catch: (cause) => failure(`cannot resolve ${name} from its staged owner`, cause),
      });
      let directory = path.dirname(yield* realInside(entry));
      while (contained(directory)) {
        const manifestPath = path.join(directory, "package.json");
        if (yield* fs.exists(manifestPath)) {
          yield* realInside(manifestPath);
          const manifest = yield* fs.readFileString(manifestPath).pipe(
            Effect.flatMap(decodeManifest),
            Effect.mapError((cause) => failure(`invalid package manifest for ${name}`, cause)),
          );
          if (manifest.name === name) {
            if (manifest.version !== version)
              return yield* failure(
                `unreviewed ${name} version ${manifest.version ?? "missing"}; expected ${version}`,
              );
            return { directory, loader: NodeModule.createRequire(manifestPath) };
          }
        }
        const parent = path.dirname(directory);
        if (parent === directory) break;
        directory = parent;
      }
      return yield* failure(`could not identify staged package ${name}`);
    });
    const sdk = yield* resolvePackage(
      NodeModule.createRequire(path.join(root, "package.json")),
      "@github/copilot-sdk",
      COPILOT_PAYLOAD_VERSIONS.sdk,
    );
    const runtime = yield* resolvePackage(
      sdk.loader,
      "@github/copilot",
      COPILOT_PAYLOAD_VERSIONS.runtime,
    );
    const koffi = yield* resolvePackage(sdk.loader, "koffi", COPILOT_PAYLOAD_VERSIONS.koffi);
    const layouts = (input.arch === "universal" ? (["arm64", "x64"] as const) : [input.arch]).map(
      (arch) => targetLayout(input.platform, arch),
    );
    const removals = new Set<string>();
    const removedNativeFiles: string[] = [];
    const isNative = (file: string) =>
      NATIVE_FILE.test(file) || ["copilot", "rg", "tgrep"].includes(path.basename(file));
    const nativeFiles = Effect.fn("copilotPayload.nativeFiles")(function* (packageRoot: string) {
      const pending = [packageRoot];
      const files: string[] = [];
      while (pending.length > 0) {
        const directory = pending.pop()!;
        for (const name of yield* fs.readDirectory(directory)) {
          const file = path.join(directory, name);
          const real = yield* realInside(file);
          if (real !== file) return yield* failure(`unexpected symlink inside payload: ${file}`);
          const info = yield* fs.stat(real);
          if (info.type === "Directory") pending.push(real);
          else if (info.type === "File" && isNative(real))
            files.push(path.relative(packageRoot, real).split(path.sep).join("/"));
          else if (info.type !== "File")
            return yield* failure(`unexpected file type in payload: ${file}`);
        }
      }
      return files;
    });
    const requireFile = Effect.fn("copilotPayload.requireFile")(function* (file: string) {
      const real = yield* realInside(file);
      if ((yield* fs.stat(real)).type !== "File")
        return yield* failure(`required payload is not a file: ${file}`);
    });
    for (const layout of layouts) {
      const platform = yield* resolvePackage(
        runtime.loader,
        `@github/copilot-${layout.target}`,
        COPILOT_PAYLOAD_VERSIONS.runtime,
      );
      const actual = yield* nativeFiles(platform.directory);
      const missing = layout.required.filter((file) => !actual.includes(file));
      const unexpected = actual.filter(
        (file) => !layout.required.includes(file) && !layout.removed.includes(file),
      );
      const candidates = actual.filter((file) => layout.removed.includes(file));
      if (
        missing.length > 0 ||
        unexpected.length > 0 ||
        (candidates.length !== 0 && candidates.length !== layout.removed.length)
      ) {
        return yield* failure(
          `unreviewed ${layout.target} layout; missing [${missing.join(", ")}], unexpected [${unexpected.join(", ")}], removable ${candidates.length}/${layout.removed.length}`,
        );
      }
      for (const file of [
        "sdk/index.js",
        "clipboard/index.js",
        "clipboard/node_modules/@teddyzhu/clipboard/index.js",
      ]) {
        yield* requireFile(path.join(platform.directory, file));
      }
      for (const file of candidates) {
        removedNativeFiles.push(
          path.relative(root, path.join(platform.directory, file)).split(path.sep).join("/"),
        );
        if (file.startsWith("clipboard/")) removals.add(path.join(platform.directory, file));
      }
      for (const directory of INTERACTIVE_DIRECTORIES) {
        const candidate = path.join(platform.directory, directory);
        if (yield* fs.exists(candidate)) removals.add(candidate);
      }
      if (layout.foreignSearchTarget) {
        for (const tool of ["ripgrep", "tgrep"]) {
          const candidate = path.join(platform.directory, tool, "bin", layout.foreignSearchTarget);
          if (yield* fs.exists(candidate)) removals.add(candidate);
        }
      }
      const binding = yield* resolvePackage(
        koffi.loader,
        `@koromix/koffi-${layout.target}`,
        COPILOT_PAYLOAD_VERSIONS.koffi,
      );
      yield* requireFile(path.join(binding.directory, `${layout.os}_${layout.arch}`, "koffi.node"));
      const bindingFiles = yield* nativeFiles(binding.directory);
      const allowedBindings = new Set([
        `${layout.os}_${layout.arch}/koffi.node`,
        ...(layout.os === "linux" ? [`musl_${layout.arch}/koffi.node`] : []),
      ]);
      if (bindingFiles.some((file) => !allowedBindings.has(file)))
        return yield* failure(`unreviewed Koffi layout for ${layout.target}`);
      if (layout.os === "linux" && bindingFiles.includes(`musl_${layout.arch}/koffi.node`)) {
        removals.add(path.join(binding.directory, `musl_${layout.arch}`));
        removedNativeFiles.push(
          path
            .relative(root, path.join(binding.directory, `musl_${layout.arch}`, "koffi.node"))
            .split(path.sep)
            .join("/"),
        );
      }
    }
    // The selected artifacts are single-platform (or two macOS architectures), not
    // the old combined Windows/Linux server tree. Reject accidental platform leaks.
    for (const os of ["darwin", "win32", "linux", "linuxmusl"]) {
      for (const arch of ["arm64", "x64"]) {
        if (layouts.some((layout) => layout.target === `${os}-${arch}`)) continue;
        const packages = [
          { name: `@github/copilot-${os}-${arch}`, loader: runtime.loader },
          ...(os === "linuxmusl"
            ? []
            : [{ name: `@koromix/koffi-${os}-${arch}`, loader: koffi.loader }]),
        ];
        for (const pkg of packages) {
          const resolved = yield* Effect.try({
            try: () => {
              try {
                return resolvePackageEntry(pkg.loader, pkg.name);
              } catch (cause) {
                if (cause instanceof Error && "code" in cause && cause.code === "MODULE_NOT_FOUND")
                  return null;
                throw cause;
              }
            },
            catch: (cause) => failure("cannot inspect foreign platform packages", cause),
          });
          if (resolved !== null && contained(resolved)) {
            return yield* failure(`unexpected installed native package ${pkg.name}`);
          }
        }
      }
    }
    for (const file of removals) {
      const real = yield* realInside(file);
      if (real !== file) return yield* failure(`pruning path changed before removal: ${file}`);
      yield* fs.remove(real, { recursive: true });
    }
    removedNativeFiles.sort();
    yield* Effect.log("Pruned reviewed Copilot SDK-server payload").pipe(
      Effect.annotateLogs({
        platform: input.platform,
        arch: input.arch,
        removedNativeFiles: removedNativeFiles.length,
      }),
    );
    return { pruned: true, removedNativeFiles };
  },
);
