import * as ChildProcess from "node:child_process";
import * as Crypto from "node:crypto";

import type {
  DesktopManagedEnvironmentCandidate,
  DesktopManagedEnvironmentRegistration,
  PersistedSavedEnvironmentRecord,
} from "@t3tools/contracts";

import type { BackendEnvironmentManager, ManagedBackendEnvironment } from "./backendEnvironment.ts";
import { DEFAULT_DESKTOP_BACKEND_PORT, resolveDesktopBackendPort } from "./backendPort.ts";
import { isBackendReadinessAborted, waitForHttpReady } from "./backendReadiness.ts";
import { waitForBackendStartupReady } from "./backendStartupReadiness.ts";
import { ServerListeningDetector } from "./serverListeningDetector.ts";

interface BackendObservabilitySettings {
  readonly otlpTracesUrl: string | undefined;
  readonly otlpMetricsUrl: string | undefined;
}

interface ManagedBackendRuntime {
  readonly environment: ManagedBackendEnvironment;
  child: ChildProcess.ChildProcess | null;
  port: number | null;
  bootstrapToken: string | null;
  httpBaseUrl: string | null;
  wsBaseUrl: string | null;
  startPromise: Promise<DesktopManagedEnvironmentRegistration> | null;
  listeningDetector: ServerListeningDetector | null;
  restartAttempt: number;
  restartTimer: ReturnType<typeof setTimeout> | null;
  expectedExit: boolean;
}

export interface DesktopManagedEnvironmentController {
  listCandidates(): readonly DesktopManagedEnvironmentCandidate[];
  prepareRegistration(environmentKey: string): Promise<DesktopManagedEnvironmentRegistration>;
  readHydratedSavedEnvironmentRegistry(
    records: readonly PersistedSavedEnvironmentRecord[],
  ): Promise<readonly PersistedSavedEnvironmentRecord[]>;
  syncAfterRegistryWrite(
    previousRecords: readonly PersistedSavedEnvironmentRecord[],
    nextRecords: readonly PersistedSavedEnvironmentRecord[],
  ): void;
  stopAll(): void;
}

interface CreateDesktopManagedEnvironmentControllerOptions {
  readonly backendEnvironmentManager: BackendEnvironmentManager;
  readonly primaryEnvironment: ManagedBackendEnvironment;
  readonly loopbackHost: string;
  readonly getPrimaryBackendPort: () => number;
  readonly getBackendChildEnv: () => NodeJS.ProcessEnv;
  readonly getObservabilitySettings: () => BackendObservabilitySettings;
  readonly getCaptureOutput: () => boolean;
  readonly captureBackendOutput: (
    child: ChildProcess.ChildProcess,
    listeningDetector: ServerListeningDetector,
  ) => void;
  readonly markExpectedExit: (child: ChildProcess.ChildProcess) => void;
  readonly isQuitting: () => boolean;
  readonly log: (message: string) => void;
}

function sanitizeLogValue(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toDesktopManagedEnvironmentCandidate(
  environment: ManagedBackendEnvironment,
): DesktopManagedEnvironmentCandidate {
  return {
    key: environment.key,
    label: environment.displayLabel,
    kind: environment.kind,
  };
}

function toManagedBackendRegistration(
  runtime: ManagedBackendRuntime,
): DesktopManagedEnvironmentRegistration {
  if (!runtime.httpBaseUrl || !runtime.wsBaseUrl || !runtime.bootstrapToken) {
    throw new Error(`Managed environment '${runtime.environment.key}' is not ready.`);
  }

  return {
    key: runtime.environment.key,
    label: runtime.environment.displayLabel,
    kind: runtime.environment.kind,
    httpBaseUrl: runtime.httpBaseUrl,
    wsBaseUrl: runtime.wsBaseUrl,
    bootstrapToken: runtime.bootstrapToken,
  };
}

function clearRestartTimer(runtime: ManagedBackendRuntime): void {
  if (runtime.restartTimer) {
    clearTimeout(runtime.restartTimer);
    runtime.restartTimer = null;
  }
}

export function createDesktopManagedEnvironmentController(
  options: CreateDesktopManagedEnvironmentControllerOptions,
): DesktopManagedEnvironmentController {
  const runtimes = new Map<string, ManagedBackendRuntime>();
  const expectedRuntimeExitChildren = new WeakSet<ChildProcess.ChildProcess>();

  function markChildExpectedExit(child: ChildProcess.ChildProcess): void {
    expectedRuntimeExitChildren.add(child);
    options.markExpectedExit(child);
  }

  function listEnvironments(): readonly ManagedBackendEnvironment[] {
    return options.backendEnvironmentManager
      .listEnvironments()
      .filter((environment) => environment.key !== options.primaryEnvironment.key);
  }

  function requireEnvironment(environmentKey: string): ManagedBackendEnvironment {
    const environment = options.backendEnvironmentManager.getEnvironment(environmentKey);
    if (!environment || environment.key === options.primaryEnvironment.key) {
      throw new Error(`Unknown managed environment '${environmentKey}'.`);
    }
    return environment;
  }

  function getOrCreateRuntime(environment: ManagedBackendEnvironment): ManagedBackendRuntime {
    const existing = runtimes.get(environment.key);
    if (existing) {
      return existing;
    }

    const runtime: ManagedBackendRuntime = {
      environment,
      child: null,
      port: null,
      bootstrapToken: null,
      httpBaseUrl: null,
      wsBaseUrl: null,
      startPromise: null,
      listeningDetector: null,
      restartAttempt: 0,
      restartTimer: null,
      expectedExit: false,
    };
    runtimes.set(environment.key, runtime);
    return runtime;
  }

  function scheduleRestart(runtime: ManagedBackendRuntime, reason: string): void {
    if (options.isQuitting() || runtime.expectedExit || runtime.restartTimer) {
      return;
    }

    const delayMs = Math.min(500 * 2 ** runtime.restartAttempt, 10_000);
    runtime.restartAttempt += 1;
    options.log(
      `managed backend exited unexpectedly key=${runtime.environment.key} reason=${sanitizeLogValue(reason)} restartMs=${delayMs}`,
    );

    runtime.restartTimer = setTimeout(() => {
      runtime.restartTimer = null;
      void ensureRegistration(runtime.environment.key).catch((error) => {
        options.log(
          `managed backend restart failed key=${runtime.environment.key} message=${sanitizeLogValue(formatErrorMessage(error))}`,
        );
      });
    }, delayMs);
    runtime.restartTimer.unref();
  }

  function stopEnvironment(environmentKey: string): void {
    const runtime = runtimes.get(environmentKey);
    if (!runtime) {
      return;
    }

    clearRestartTimer(runtime);
    runtime.expectedExit = true;
    runtime.listeningDetector = null;

    const child = runtime.child;
    runtime.child = null;
    runtime.startPromise = null;
    runtimes.delete(environmentKey);

    if (!child) {
      return;
    }

    if (child.exitCode === null && child.signalCode === null) {
      markChildExpectedExit(child);
      child.kill("SIGTERM");
      setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill("SIGKILL");
        }
      }, 2_000).unref();
    }
  }

  async function startRuntime(
    runtime: ManagedBackendRuntime,
  ): Promise<DesktopManagedEnvironmentRegistration> {
    clearRestartTimer(runtime);

    if (!runtime.environment.target.ensureReady()) {
      throw new Error(
        `Managed backend target '${runtime.environment.displayLabel}' is not available.`,
      );
    }

    const preferredPort =
      runtime.port ??
      Math.max(DEFAULT_DESKTOP_BACKEND_PORT + 1, options.getPrimaryBackendPort() + 1);
    const port = await resolveDesktopBackendPort({
      host: options.loopbackHost,
      startPort: preferredPort,
    });

    runtime.port = port;
    if (runtime.expectedExit) {
      throw new Error("Managed backend start canceled.");
    }
    runtime.bootstrapToken = Crypto.randomBytes(24).toString("hex");
    runtime.httpBaseUrl = `http://${options.loopbackHost}:${port}`;
    runtime.wsBaseUrl = `ws://${options.loopbackHost}:${port}`;

    const listeningDetector = new ServerListeningDetector();
    runtime.listeningDetector = listeningDetector;
    let child: ChildProcess.ChildProcess | null = null;

    try {
      const observabilitySettings = options.getObservabilitySettings();
      const spawnResult = runtime.environment.target.spawn(
        {
          mode: "desktop",
          noBrowser: true,
          port,
          t3Home: runtime.environment.baseDir,
          host: options.loopbackHost,
          desktopBootstrapToken: runtime.bootstrapToken,
          ...(observabilitySettings.otlpTracesUrl
            ? { otlpTracesUrl: observabilitySettings.otlpTracesUrl }
            : {}),
          ...(observabilitySettings.otlpMetricsUrl
            ? { otlpMetricsUrl: observabilitySettings.otlpMetricsUrl }
            : {}),
        },
        {
          env: options.getBackendChildEnv(),
          captureOutput: options.getCaptureOutput(),
        },
      );

      const startedChild = spawnResult.child;
      child = startedChild;
      if (!spawnResult.bootstrapDelivered) {
        startedChild.kill("SIGTERM");
        throw new Error("Failed to deliver managed backend bootstrap config.");
      }

      runtime.child = startedChild;
      options.captureBackendOutput(startedChild, listeningDetector);
      options.log(
        `managed backend start requested key=${runtime.environment.key} port=${port} target=${runtime.environment.displayLabel}`,
      );

      startedChild.once("spawn", () => {
        runtime.restartAttempt = 0;
      });

      startedChild.on("error", (error) => {
        if (runtime.listeningDetector === listeningDetector) {
          listeningDetector.fail(error);
          runtime.listeningDetector = null;
        }
        const wasExpected =
          runtime.expectedExit ||
          options.isQuitting() ||
          expectedRuntimeExitChildren.has(startedChild);
        if (runtime.child === startedChild) {
          runtime.child = null;
        }
        if (wasExpected) {
          return;
        }
        scheduleRestart(runtime, error.message);
      });

      startedChild.on("exit", (code, signal) => {
        if (runtime.listeningDetector === listeningDetector) {
          listeningDetector.fail(
            new Error(
              `managed backend exited before readiness (code=${code ?? "null"} signal=${signal ?? "null"})`,
            ),
          );
          runtime.listeningDetector = null;
        }
        const wasExpected =
          runtime.expectedExit ||
          options.isQuitting() ||
          expectedRuntimeExitChildren.has(startedChild);
        if (runtime.child === startedChild) {
          runtime.child = null;
        }
        if (wasExpected) {
          return;
        }
        scheduleRestart(runtime, `code=${code ?? "null"} signal=${signal ?? "null"}`);
      });

      await waitForBackendStartupReady({
        listeningPromise: listeningDetector.promise,
        waitForHttpReady: () =>
          waitForHttpReady(runtime.httpBaseUrl ?? `http://${options.loopbackHost}:${port}`, {
            timeoutMs: 60_000,
          }),
        cancelHttpWait: () => undefined,
      });

      runtime.listeningDetector = null;
      if (runtime.expectedExit) {
        throw new Error("Managed backend start canceled.");
      }
      options.log(
        `managed backend ready key=${runtime.environment.key} baseUrl=${runtime.httpBaseUrl}`,
      );
      return toManagedBackendRegistration(runtime);
    } catch (error) {
      runtime.listeningDetector = null;
      if (runtime.child === child) {
        runtime.child = null;
      }
      if (child && child.exitCode === null && child.signalCode === null) {
        const childToKill = child;
        markChildExpectedExit(childToKill);
        childToKill.kill("SIGTERM");
        setTimeout(() => {
          if (childToKill.exitCode === null && childToKill.signalCode === null) {
            childToKill.kill("SIGKILL");
          }
        }, 2_000).unref();
      }
      runtime.bootstrapToken = null;
      runtime.httpBaseUrl = null;
      runtime.wsBaseUrl = null;
      throw error;
    }
  }

  async function ensureRegistration(
    environmentKey: string,
  ): Promise<DesktopManagedEnvironmentRegistration> {
    const environment = requireEnvironment(environmentKey);
    const runtime = getOrCreateRuntime(environment);

    if (runtime.startPromise) {
      return runtime.startPromise;
    }

    if (runtime.child && runtime.httpBaseUrl && runtime.wsBaseUrl && runtime.bootstrapToken) {
      return toManagedBackendRegistration(runtime);
    }

    const startPromise = startRuntime(runtime).finally(() => {
      if (runtime.startPromise === startPromise) {
        runtime.startPromise = null;
      }
    });
    runtime.startPromise = startPromise;
    return startPromise;
  }

  return {
    listCandidates(): readonly DesktopManagedEnvironmentCandidate[] {
      return listEnvironments().map((environment) =>
        toDesktopManagedEnvironmentCandidate(environment),
      );
    },
    prepareRegistration: ensureRegistration,
    async readHydratedSavedEnvironmentRegistry(records) {
      const hydratedRecords: PersistedSavedEnvironmentRecord[] = [];

      for (const record of records) {
        if (record.management?.kind !== "desktop-managed") {
          hydratedRecords.push(record);
          continue;
        }

        try {
          const registration = await ensureRegistration(record.management.environmentKey);
          hydratedRecords.push({
            ...record,
            httpBaseUrl: registration.httpBaseUrl,
            wsBaseUrl: registration.wsBaseUrl,
          });
        } catch (error) {
          if (!isBackendReadinessAborted(error)) {
            options.log(
              `managed backend hydration warning key=${record.management.environmentKey} message=${sanitizeLogValue(formatErrorMessage(error))}`,
            );
          }
          hydratedRecords.push(record);
        }
      }

      return hydratedRecords;
    },
    syncAfterRegistryWrite(previousRecords, nextRecords) {
      const nextManagedKeys = new Set(
        nextRecords.flatMap((record) =>
          record.management?.kind === "desktop-managed" ? [record.management.environmentKey] : [],
        ),
      );

      for (const record of previousRecords) {
        if (
          record.management?.kind === "desktop-managed" &&
          !nextManagedKeys.has(record.management.environmentKey)
        ) {
          stopEnvironment(record.management.environmentKey);
        }
      }
    },
    stopAll() {
      for (const environmentKey of runtimes.keys()) {
        stopEnvironment(environmentKey);
      }
    },
  };
}
