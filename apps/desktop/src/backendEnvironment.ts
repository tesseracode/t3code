import * as OS from "node:os";
import * as Path from "node:path";

import { LocalBackendTarget, type BackendTarget } from "./backendTarget.ts";
import {
  extractWslDistroFromPath,
  isNodeAvailableInWsl,
  isWslAvailable,
  isWslPath,
  listWslDistros,
  WslBackendTarget,
} from "./wslBackendTarget.ts";
import { prepareWslServerBundle } from "./wslServerBundle.ts";

export interface ManagedBackendEnvironment {
  readonly key: string;
  readonly displayLabel: string;
  readonly kind: BackendTarget["type"];
  readonly target: BackendTarget;
  readonly baseDir: string;
}

export interface BackendEnvironmentManager {
  readonly primaryEnvironment: ManagedBackendEnvironment;
  listEnvironments(): readonly ManagedBackendEnvironment[];
  getEnvironment(key: string): ManagedBackendEnvironment | undefined;
  resolveEnvironmentForPath(folderPath: string): ManagedBackendEnvironment;
}

interface CreateDefaultBackendEnvironmentManagerOptions {
  readonly rootBaseDir: string;
  readonly appRoot: string;
}

function environmentPathFragment(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : "default";
}

function makeLocalEnvironment(rootBaseDir: string): ManagedBackendEnvironment {
  const target = new LocalBackendTarget();
  return {
    key: "local",
    displayLabel: target.displayLabel,
    kind: target.type,
    target,
    baseDir: rootBaseDir,
  };
}

function makeWslEnvironment(
  rootBaseDir: string,
  distro: string,
  installSourceRoot: string,
  installFingerprint: string,
): ManagedBackendEnvironment {
  const target = new WslBackendTarget({
    distro,
    installSourceRoot,
    installFingerprint,
  });
  return {
    key: `wsl:${distro}`,
    displayLabel: target.displayLabel,
    kind: target.type,
    target,
    baseDir: Path.join(rootBaseDir, "environments", "wsl", environmentPathFragment(distro)),
  };
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function prepareOptionalWslServerBundle(input: {
  readonly appRoot: string;
  readonly cacheRoot: string;
}) {
  try {
    return prepareWslServerBundle(input);
  } catch (error) {
    console.error(
      `[desktop] Failed to prepare WSL server bundle; WSL managed environments disabled: ${formatErrorMessage(error)}`,
    );
    return undefined;
  }
}

export function createDefaultBackendEnvironmentManager(
  options: CreateDefaultBackendEnvironmentManagerOptions,
): BackendEnvironmentManager {
  const localEnvironment = makeLocalEnvironment(options.rootBaseDir);

  const wslEnvironments =
    process.platform === "win32" && isWslAvailable()
      ? (() => {
          const bundle = prepareOptionalWslServerBundle({
            appRoot: options.appRoot,
            cacheRoot: Path.join(OS.homedir(), ".t3", "wsl-server-bundles"),
          });
          if (!bundle) {
            return [];
          }

          return listWslDistros()
            .filter((distro) => isNodeAvailableInWsl(distro.name))
            .map((distro) =>
              makeWslEnvironment(
                options.rootBaseDir,
                distro.name,
                bundle.hostPath,
                bundle.fingerprint,
              ),
            );
        })()
      : [];

  const allEnvironments = [localEnvironment, ...wslEnvironments];
  const byKey = new Map(allEnvironments.map((environment) => [environment.key, environment]));
  // Keep the desktop bootstrap local. Extra WSL environments are opt-in via Connections.
  const primaryEnvironment = localEnvironment;

  return {
    primaryEnvironment,
    listEnvironments(): readonly ManagedBackendEnvironment[] {
      return allEnvironments;
    },
    getEnvironment(key: string): ManagedBackendEnvironment | undefined {
      return byKey.get(key);
    },
    resolveEnvironmentForPath(folderPath: string): ManagedBackendEnvironment {
      if (!isWslPath(folderPath)) {
        return localEnvironment;
      }

      const distro = extractWslDistroFromPath(folderPath);
      if (!distro) {
        return localEnvironment;
      }

      return byKey.get(`wsl:${distro}`) ?? localEnvironment;
    },
  };
}
