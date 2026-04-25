/**
 * BackendTarget — Abstraction for where the T3 Code server runs.
 *
 * The desktop app spawns a backend server process. By default this runs
 * locally (LocalBackendTarget). For WSL support, a WslBackendTarget
 * spawns the server inside a WSL distro via wsl.exe.
 *
 * @module backendTarget
 */
import * as ChildProcess from "node:child_process";
import * as FS from "node:fs";
import * as OS from "node:os";
import * as Path from "node:path";
import { app } from "electron";

/**
 * Bootstrap configuration passed to the backend server on startup.
 */
export interface BackendBootstrapConfig {
  readonly mode: "desktop";
  readonly noBrowser: boolean;
  readonly port: number;
  readonly t3Home: string;
  readonly host: string;
  readonly desktopBootstrapToken: string;
  readonly otlpTracesUrl?: string;
  readonly otlpMetricsUrl?: string;
}

/**
 * Result of spawning a backend server.
 */
export interface BackendSpawnResult {
  readonly child: ChildProcess.ChildProcess;
  /** True if the bootstrap config was successfully delivered */
  readonly bootstrapDelivered: boolean;
}

/**
 * BackendTarget — Defines how to spawn and communicate with a backend server.
 */
export interface BackendTarget {
  /** Target type identifier */
  readonly type: "local" | "wsl";
  /** Human-readable label for UI display */
  readonly displayLabel: string;
  /**
   * Prepare the target for startup, performing any one-time setup required
   * before the backend process can be spawned.
   */
  ensureReady(): boolean;
  /**
   * Spawn the backend server process.
   * The caller is responsible for event handling (error, exit, readiness detection).
   */
  spawn(
    config: BackendBootstrapConfig,
    options: {
      readonly env: NodeJS.ProcessEnv;
      readonly captureOutput: boolean;
    },
  ): BackendSpawnResult;
  /**
   * Translate a path from the host OS to the target's filesystem.
   * For local targets, this is a no-op.
   * For WSL targets, this converts Windows paths to Linux paths.
   */
  translatePath(hostPath: string): string;
  /**
   * Check if the target is available (e.g., WSL is installed and a distro exists).
   */
  isAvailable(): boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────

function resolveAppRoot(): string {
  if (!app.isPackaged) {
    // Development: resolve from the compiled desktop bundle back to the repo root.
    return Path.resolve(__dirname, "../../..");
  }
  // Production: app.asar root
  return app.getAppPath();
}

function resolveBackendEntry(): string {
  return Path.join(resolveAppRoot(), "apps/server/dist/bin.mjs");
}

function resolveBackendCwd(): string {
  if (!app.isPackaged) {
    return resolveAppRoot();
  }
  return OS.homedir();
}

// ── LocalBackendTarget ─────────────────────────────────────────────────

/**
 * LocalBackendTarget — Spawns the server as a local child process.
 * This wraps the existing behavior from main.ts startBackend().
 */
export class LocalBackendTarget implements BackendTarget {
  readonly type = "local" as const;
  readonly displayLabel = "Local";

  ensureReady(): boolean {
    return this.isAvailable();
  }

  spawn(
    config: BackendBootstrapConfig,
    options: {
      readonly env: NodeJS.ProcessEnv;
      readonly captureOutput: boolean;
    },
  ): BackendSpawnResult {
    const backendEntry = resolveBackendEntry();

    const child = ChildProcess.spawn(process.execPath, [backendEntry, "--bootstrap-fd", "3"], {
      cwd: resolveBackendCwd(),
      env: {
        ...options.env,
        ELECTRON_RUN_AS_NODE: "1",
      },
      stdio: options.captureOutput
        ? ["ignore", "pipe", "pipe", "pipe"]
        : ["ignore", "inherit", "inherit", "pipe"],
    });

    // Deliver bootstrap config via fd 3 pipe
    const bootstrapStream = child.stdio[3];
    let bootstrapDelivered = false;
    if (bootstrapStream && "write" in bootstrapStream) {
      bootstrapStream.write(`${JSON.stringify(config)}\n`);
      bootstrapStream.end();
      bootstrapDelivered = true;
    }

    return { child, bootstrapDelivered };
  }

  translatePath(hostPath: string): string {
    return hostPath; // No-op for local target
  }

  isAvailable(): boolean {
    const entry = resolveBackendEntry();
    return FS.existsSync(entry);
  }
}

/**
 * Create the default backend target.
 *
 * Desktop bootstraps locally by default. Extra WSL runtimes are exposed as
 * opt-in managed environments via Connections.
 */
export function createDefaultBackendTarget(): BackendTarget {
  return new LocalBackendTarget();
}
