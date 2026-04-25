/**
 * WslBackendTarget — Spawns the T3 Code server inside a WSL distro.
 *
 * Uses `wsl.exe` to start a Node.js process inside the Linux environment.
 * Communication happens over localhost TCP (WSL2 shares host network stack).
 *
 * Prerequisites:
 * - Windows 10/11 with WSL2 installed
 * - At least one WSL distro configured
 * - Node.js installed inside the WSL distro (system, nvm, fnm, etc.)
 *
 * @module wslBackendTarget
 */
import * as ChildProcess from "node:child_process";

import type { BackendBootstrapConfig, BackendSpawnResult, BackendTarget } from "./backendTarget.ts";

// ── WSL Helpers ────────────────────────────────────────────────────────

/** Build distro args for wsl.exe */
function distroArgs(distro?: string): string[] {
  return distro ? ["-d", distro] : [];
}

/**
 * Run a command inside WSL using execFileSync (no shell interpolation).
 * Uses `--exec` to bypass the default shell (avoids variable expansion
 * by zsh/bash login shells mangling arguments).
 * Returns trimmed stdout, or undefined on failure.
 */
function wslExec(
  args: string[],
  options?: { distro?: string | undefined; timeout?: number | undefined },
): string | undefined {
  if (process.platform !== "win32") return undefined;
  try {
    const output = ChildProcess.execFileSync(
      "wsl.exe",
      [...distroArgs(options?.distro), "--exec", ...args],
      {
        encoding: "utf-8",
        timeout: options?.timeout ?? 10000,
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    return output.trim();
  } catch {
    return undefined;
  }
}

/**
 * Run a command inside WSL, returning only the exit code (0 = success).
 */
function wslTest(
  args: string[],
  options?: { distro?: string | undefined; timeout?: number | undefined },
): boolean {
  if (process.platform !== "win32") return false;
  try {
    ChildProcess.execFileSync("wsl.exe", [...distroArgs(options?.distro), "--exec", ...args], {
      stdio: "ignore",
      timeout: options?.timeout ?? 10000,
    });
    return true;
  } catch {
    return false;
  }
}

// ── Node.js Resolution ─────────────────────────────────────────────────

/**
 * Shell snippet that resolves node even when managed by nvm/fnm.
 * Tries bare `node` first, then sources nvm if available.
 * Used by both detection and spawn for consistency.
 *
 * The snippet is a static string — dynamic values (server entry,
 * bootstrap JSON) are passed via `bash -c '...' bash "$1" "$2"` positional
 * args to avoid shell-injection issues.
 */
const NODE_RESOLVE_PREAMBLE = [
  "if ! command -v node >/dev/null 2>&1; then",
  '  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"',
  '  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"',
  // Try fnm
  "  if ! command -v node >/dev/null 2>&1 && command -v fnm >/dev/null 2>&1; then",
  '    eval "$(fnm env)"',
  "  fi",
  "fi",
].join("\n");

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
  if (process.platform !== "win32") return false;
  try {
    ChildProcess.execFileSync("wsl.exe", ["--status"], {
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
  if (process.platform !== "win32") return [];
  try {
    // wsl.exe --list --quiet outputs UTF-16LE with null bytes
    const raw = ChildProcess.execFileSync("wsl.exe", ["--list", "--quiet"], {
      timeout: 10000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    // Decode as UTF-16LE and strip null bytes / BOM
    const output = raw
      .toString("utf16le")
      .replace(/^\uFEFF/, "")
      .replace(/\0/g, "");
    const lines = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) return [];

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
  if (process.platform !== "win32") return windowsPath;
  const result = wslExec(["wslpath", "-u", windowsPath], { distro, timeout: 5000 });
  return result ?? manualWindowsToWslPath(windowsPath);
}

/**
 * Convert a WSL/Linux path to a Windows UNC path.
 */
export function wslToWindowsPath(wslPath: string, distro?: string): string {
  if (process.platform !== "win32") return wslPath;
  const result = wslExec(["wslpath", "-w", wslPath], { distro, timeout: 5000 });
  if (result) return result;
  // Fallback: manual conversion (/home/user/... → \\wsl.localhost\distro\home\user\...)
  const distroName = distro ?? "Ubuntu";
  return `\\\\wsl.localhost\\${distroName}${wslPath.replace(/\//g, "\\")}`;
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
  return wslTest(["bash", "-c", `test -f "$HOME/${WSL_SERVER_DIR}/apps/server/dist/bin.mjs"`], {
    distro,
    timeout: 5000,
  });
}

/**
 * Check if Node.js is available inside a WSL distro.
 * Handles nvm / fnm managed installs by sourcing their init scripts.
 */
export function isNodeAvailableInWsl(distro?: string): boolean {
  if (process.platform !== "win32") return false;
  try {
    ChildProcess.execFileSync(
      "wsl.exe",
      [...distroArgs(distro), "--exec", "bash", "-c", `${NODE_RESOLVE_PREAMBLE}\nnode --version`],
      { stdio: "ignore", timeout: 10000 },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Install the server bundle into a WSL distro's ~/.t3/server/ directory.
 * Copies the built server dist from the Windows host into WSL.
 * Returns true on success.
 */
export function installServerInWsl(hostServerDir: string, distro?: string): boolean {
  if (process.platform !== "win32") return false;

  const wslServerDir = `$HOME/${WSL_SERVER_DIR}`;
  const wslHostPath = windowsToWslPath(hostServerDir, distro);

  // Create target directory and copy server files
  const script = [
    `mkdir -p "${wslServerDir}/apps/server"`,
    `cp -r "${wslHostPath}/apps/server/dist" "${wslServerDir}/apps/server/dist"`,
    // Copy package.json and node_modules if they exist
    `[ -f "${wslHostPath}/apps/server/package.json" ] && cp "${wslHostPath}/apps/server/package.json" "${wslServerDir}/apps/server/"`,
    `[ -d "${wslHostPath}/node_modules" ] && cp -r "${wslHostPath}/node_modules" "${wslServerDir}/node_modules"`,
    `[ -f "${wslHostPath}/package.json" ] && cp "${wslHostPath}/package.json" "${wslServerDir}/"`,
  ].join(" && ");

  try {
    ChildProcess.execFileSync("wsl.exe", [...distroArgs(distro), "--exec", "bash", "-c", script], {
      stdio: "ignore",
      timeout: 120000,
    });
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
 * - Node.js resolved via nvm/fnm if not on system PATH
 * - Dynamic values passed as positional args to bash -c (no shell injection)
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

  spawn(
    config: BackendBootstrapConfig,
    options: {
      readonly env: NodeJS.ProcessEnv;
      readonly captureOutput: boolean;
    },
  ): BackendSpawnResult {
    const serverEntryRelative = `${WSL_SERVER_DIR}/apps/server/dist/bin.mjs`;

    // Translate t3Home to WSL path
    const wslT3Home = windowsToWslPath(config.t3Home, this.distro);
    const wslConfig: BackendBootstrapConfig = {
      ...config,
      t3Home: wslT3Home,
    };

    // fd 3 pipe doesn't work across wsl.exe — use --bootstrap-json instead.
    // Keep the server entry path inside the bash script so `$HOME` expands in
    // the WSL shell rather than being passed to Node as a literal string.
    const bootstrapJson = JSON.stringify(wslConfig);

    const child = ChildProcess.spawn(
      "wsl.exe",
      [
        ...distroArgs(this.distro),
        "--exec",
        "bash",
        "-c",
        // $1 = bootstrapJson (passed as a positional arg below)
        `${NODE_RESOLVE_PREAMBLE}\nexec node "$HOME/${serverEntryRelative}" --bootstrap-json "$1"`,
        "bash", // $0
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
    if (!isWslAvailable()) return false;
    const distro = this.distro ?? getDefaultWslDistro();
    if (!distro) return false;
    if (!isNodeAvailableInWsl(distro)) return false;
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
  return normalized.startsWith("//wsl.localhost/") || normalized.startsWith("//wsl$/");
}

/**
 * Extract the distro name from a WSL UNC path.
 */
export function extractWslDistroFromPath(folderPath: string): string | undefined {
  const normalized = folderPath.replace(/\\/g, "/");
  const match = normalized.match(/^\/\/wsl(?:\.localhost|\$)\/([^/]+)/i);
  return match?.[1];
}
