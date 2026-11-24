// @effect-diagnostics nodeBuiltinImport:off
import * as NodeModule from "node:module";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeFS from "node:fs";
import * as NodeSea from "node:sea";
import type { CopilotClient, CopilotClientOptions } from "@github/copilot-sdk";
import type { CopilotSettings } from "../settings.ts";

const require = NodeModule.createRequire(import.meta.url);

export const createClient = (options: CopilotClientOptions): CopilotClient =>
  new (require("@github/copilot-sdk") as typeof import("@github/copilot-sdk")).CopilotClient(
    options,
  );

export interface HostRuntime {
  readonly packaged: boolean;
  readonly electron: boolean;
  readonly platform: string;
  readonly architecture: string;
  readonly resolve: (name: string) => string;
  readonly exists: (path: string) => boolean;
}

function hostRuntime(): HostRuntime {
  return {
    packaged: typeof process.versions.electron === "string" || NodeSea.isSea(),
    electron: typeof process.versions.electron === "string",
    // oxlint-disable-next-line t3code/no-global-process-runtime -- SDK options are synchronous; tests inject the host descriptor.
    platform: NodeOS.platform(),
    // oxlint-disable-next-line t3code/no-global-process-runtime -- SDK options are synchronous; tests inject the host descriptor.
    architecture: NodeOS.arch(),
    resolve: (name) =>
      NodeModule.createRequire(require.resolve("@github/copilot-sdk")).resolve(name),
    exists: NodeFS.existsSync,
  };
}

export function bundledCliPath(runtime: HostRuntime): string | undefined {
  if (!runtime.packaged) return undefined;
  if (
    !["darwin", "linux", "win32"].includes(runtime.platform) ||
    !["arm64", "x64"].includes(runtime.architecture)
  ) {
    throw new Error("Unsupported GitHub Copilot runtime platform.");
  }
  for (const platform of runtime.platform === "linux"
    ? ["linux", "linuxmusl"]
    : [runtime.platform]) {
    try {
      const path = runtime.resolve(`@github/copilot-${platform}-${runtime.architecture}`);
      const executable = runtime.electron
        ? path.replace(/([\\/][^\\/]+\.asar)(?=[\\/])/u, "$1.unpacked")
        : path;
      if (runtime.exists(executable)) return executable;
    } catch {
      /* The Linux libc variant may not be installed. */
    }
  }
  throw new Error("The bundled GitHub Copilot executable is unavailable.");
}

export function resolveClientConfiguration(
  input: {
    readonly settings: CopilotSettings;
    readonly cwd: string;
    readonly environment: NodeJS.ProcessEnv;
  },
  runtime: HostRuntime = hostRuntime(),
): { readonly options: CopilotClientOptions; readonly effectiveHome: string } {
  const { settings, environment } = input;
  const hostHome = environment.HOME || environment.USERPROFILE || NodeOS.homedir();
  const configuredHome =
    settings.homePath.trim() ||
    environment.COPILOT_HOME?.trim() ||
    NodePath.join(hostHome, ".copilot");
  const expandedHome =
    configuredHome === "~"
      ? hostHome
      : /^~[/\\]/u.test(configuredHome)
        ? NodePath.join(hostHome, configuredHome.slice(2))
        : configuredHome;
  const effectiveHome = NodePath.resolve(expandedHome);
  const binaryPath = settings.binaryPath?.trim();
  const configured =
    binaryPath && !/^copilot(?:\.(?:exe|cmd|bat))?$/iu.test(binaryPath) ? binaryPath : undefined;
  const connection = environment.COPILOT_SDK_DEFAULT_CONNECTION?.trim().toLowerCase();
  const bundled =
    !configured && !environment.COPILOT_CLI_PATH?.trim() && (!connection || connection === "stdio")
      ? bundledCliPath(runtime)
      : undefined;
  const override = configured ?? bundled;
  return {
    effectiveHome,
    options: {
      mode: "copilot-cli",
      workingDirectory: input.cwd,
      baseDirectory: effectiveHome,
      env: { ...environment, COPILOT_HOME: effectiveHome },
      logLevel: "error",
      ...(override
        ? {
            connection: (
              require("@github/copilot-sdk") as typeof import("@github/copilot-sdk")
            ).RuntimeConnection.forStdio({ path: override }),
          }
        : {}),
    },
  };
}
