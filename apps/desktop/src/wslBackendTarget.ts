/**
 * WslBackendTarget — Spawns the T3 Code server inside a WSL distro.
 *
 * Uses `wsl.exe` to start a Node.js process inside the Linux environment.
 * Communication happens over localhost TCP (WSL2 shares host network stack).
 *
 * Prerequisites:
 * - Windows 10/11 with WSL2 installed
 * - At least one WSL distro configured
 * - Node.js installed inside the WSL distro
 *
 * @module wslBackendTarget
 */
import * as ChildProcess from "node:child_process";
import * as Path from "node:path";

import type {
  BackendBootstrapConfig,
  BackendSpawnResult,
  BackendTarget,
} from "./backendTarget.ts";

// ── WSL Detection ──────────────────────────────────────────────────────

export interface WslDistro {
  readonly name: string;
  readonly isDefault: boolean;
}

/**
 * Check if WSL is available on this system.
 * Returns false on non-Windows or if wsl.exe is not found.
 */
export function isWslAvailable(): boolean {
  if (process.platform !== "win32") {
    return false;
  }
  try {
    ChildProcess.execSync("wsl.exe --status", {
      stdio: "ignore",
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * List installed WSL distros.
 */
export function listWslDistros(): WslDistro[] {
  if (process.platform !== "win32") {
    return [];
  }
  try {
    // wsl.exe --list --quiet outputs one distro name per line
    const output = ChildProcess.execSync("wsl.exe --list --quiet", {
      encoding: "utf-8",
      timeout: 10000,
    });
    // Remove BOM and filter empty lines
    const lines = output
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return [];
    }

    // First line from --list --quiet is the default distro
    return lines.map((name, index) => ({
      name,
      isDefault: index === 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Get the default WSL distro name, or undefined if none available.
 */
export function getDefaultWslDistro(): string | undefined {
  const distros = listWslDistros();
  return distros.find((d) => d.isDefault)?.name ?? distros[0]?.name;
}

// ── Path Translation ───────────────────────────────────────────────────

/**
 * Convert a Windows path to a WSL/Linux path.
 * Uses `wslpath` utility inside WSL for accurate translation.
 * Falls back to manual conversion if wslpath fails.
 */
export function windowsToWslPath(windowsPath: string, distro?: string): string {
  if (process.platform !== "win32") {
    return windowsPath;
  }
  try {
    const distroArgs = distro ? ["-d", distro] : [];
    const output = ChildProcess.execSync(
      `wsl.exe ${distroArgs.join(" ")} -- wslpath -u "${windowsPath.replace(/"/g, '\\"')}"`,
      { encoding: "utf-8", timeout: 5000 },
    );
    return output.trim();
  } catch {
    // Fallback: manual conversion (C:\Users\... → /mnt/c/Users/...)
    return manualWindowsToWslPath(windowsPath);
  }
}

/**
 * Convert a WSL/Linux path to a Windows UNC path.
 */
export function wslToWindowsPath(wslPath: string, distro?: string): string {
  if (process.platform !== "win32") {
    return wslPath;
  }
  try {
    const distroArgs = distro ? ["-d", distro] : [];
    const output = ChildProcess.execSync(
      `wsl.exe ${distroArgs.join(" ")} -- wslpath -w "${wslPath.replace(/"/g, '\\"')}"`,
      { encoding: "utf-8", timeout: 5000 },
    );
    return output.trim();
  } catch {
    // Fallback: manual conversion (/home/user/... → \\wsl.localhost\distro\home\user\...)
    const distroName = distro ?? "Ubuntu";
    return `\\\\wsl.localhost\\${distroName}${wslPath.replace(/\//g, "\\")}`;
  }
}

function manualWindowsToWslPath(windowsPath: string): string {
  // C:\Users\foo\bar → /mnt/c/Users/foo/bar
  const normalized = windowsPath.replace(/\\/g, "/");
  const match = normalized.match(/^([A-Za-z]):(\/.*)/);
  if (match && match[1] && match[2]) {
    return `/mnt/${match[1].toLowerCase()}${match[2]}`;
  }
  // UNC path: \\wsl.localhost\Ubuntu\home\... → /home/...
  const uncMatch = normalized.match(/^\/\/wsl\.localhost\/[^/]+(.+)/);
  if (uncMatch && uncMatch[1]) {
    return uncMatch[1];
  }
  return windowsPath;
}

// ── Server Installation ────────────────────────────────────────────────

const WSL_SERVER_DIR = ".t3/server";

/**
 * Check if the server is installed inside a WSL distro.
 */
export function isServerInstalledInWsl(distro?: string): boolean {
  if (process.platform !== "win32") {
    return false;
  }
  try {
    const distroArgs = distro ? ["-d", distro] : [];
    ChildProcess.execSync(
      `wsl.exe ${distroArgs.join(" ")} -- test -f ~/${WSL_SERVER_DIR}/apps/server/dist/bin.mjs`,
      { stdio: "ignore", timeout: 5000 },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Node.js is available inside a WSL distro.
 */
export function isNodeAvailableInWsl(distro?: string): boolean {
  if (process.platform !== "win32") {
    return false;
  }
  try {
    const distroArgs = distro ? ["-d", distro] : [];
    ChildProcess.execSync(
      `wsl.exe ${distroArgs.join(" ")} -- node --version`,
      { stdio: "ignore", timeout: 5000 },
    );
    return true;
  } catch {
    return false;
  }
}

// ── WslBackendTarget ───────────────────────────────────────────────────

export interface WslBackendTargetOptions {
  /** WSL distro name (defaults to the default distro) */
  readonly distro?: string;
}

/**
 * WslBackendTarget — Spawns the server inside a WSL distro.
 *
 * Architecture:
 * - Server runs as a Node.js process inside WSL
 * - Communication via localhost TCP (WSL2 shares host network stack)
 * - Bootstrap config passed via --bootstrap-json CLI arg (fd 3 pipe
 *   doesn't work across wsl.exe boundary)
 * - Path translation at the boundary via wslpath
 */
export class WslBackendTarget implements BackendTarget {
  readonly type = "wsl" as const;
  readonly distro: string | undefined;

  constructor(options?: WslBackendTargetOptions) {
    this.distro = options?.distro;
  }

  get displayLabel(): string {
    return this.distro ? `WSL (${this.distro})` : "WSL";
  }

  spawn(config: BackendBootstrapConfig, options: {
    readonly env: NodeJS.ProcessEnv;
    readonly captureOutput: boolean;
  }): BackendSpawnResult {
    const distroArgs = this.distro ? ["-d", this.distro] : [];
    const serverEntry = `~/${WSL_SERVER_DIR}/apps/server/dist/bin.mjs`;

    // Translate t3Home to WSL path
    const wslT3Home = windowsToWslPath(config.t3Home, this.distro);
    const wslConfig: BackendBootstrapConfig = {
      ...config,
      t3Home: wslT3Home,
    };

    // fd 3 pipe doesn't work across wsl.exe — use --bootstrap-json instead
    const bootstrapJson = JSON.stringify(wslConfig);

    const child = ChildProcess.spawn(
      "wsl.exe",
      [
        ...distroArgs,
        "--",
        "node",
        serverEntry,
        "--bootstrap-json",
        bootstrapJson,
      ],
      {
        env: options.env,
        stdio: options.captureOutput
          ? ["ignore", "pipe", "pipe"]
          : ["ignore", "inherit", "inherit"],
      },
    );

    return { child, bootstrapDelivered: true };
  }

  translatePath(hostPath: string): string {
    return windowsToWslPath(hostPath, this.distro);
  }

  isAvailable(): boolean {
    if (!isWslAvailable()) {
      return false;
    }
    const distro = this.distro ?? getDefaultWslDistro();
    if (!distro) {
      return false;
    }
    if (!isNodeAvailableInWsl(distro)) {
      return false;
    }
    return isServerInstalledInWsl(distro);
  }
}

/**
 * Detect if a folder path is inside WSL.
 * WSL paths on Windows are UNC paths: \\wsl.localhost\DistroName\...
 * or \\wsl$\DistroName\...
 */
export function isWslPath(folderPath: string): boolean {
  const normalized = folderPath.toLowerCase().replace(/\\/g, "/");
  return (
    normalized.startsWith("//wsl.localhost/") ||
    normalized.startsWith("//wsl$/")
  );
}

/**
 * Extract the distro name from a WSL UNC path.
 */
export function extractWslDistroFromPath(folderPath: string): string | undefined {
  const normalized = folderPath.replace(/\\/g, "/");
  const match = normalized.match(/^\/\/wsl(?:\.localhost|\$)\/([^/]+)/i);
  return match?.[1];
}
