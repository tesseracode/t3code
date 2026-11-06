import { ProviderDriverKind, type ServerProviderSkill } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Option from "effect/Option";
import * as ProviderHost from "@t3tools/provider-core/server/ProviderHost";
import * as McpProviderSessions from "@t3tools/provider-core/server/McpProviderSessions";
import type { ProviderDriver, ProviderInstance } from "@t3tools/provider-core/server/driver";
import { ProviderDriverError } from "@t3tools/provider-core/server/errors";
import { makeManagedServerProvider } from "@t3tools/provider-core/server/managedProvider";
import { withInstanceIdentity } from "@t3tools/provider-core/server/instanceIdentity";
import { mergeProviderInstanceEnvironment } from "@t3tools/provider-core/server/instanceEnvironment";
import { makeManualOnlyProviderMaintenanceCapabilities } from "@t3tools/provider-core/server/maintenanceResolver";
import {
  haveProviderSnapshotSettingsChanged,
  makeProviderSnapshotSettingsSource,
} from "@t3tools/provider-core/server/snapshotSettings";
import { CopilotSettings } from "../settings.ts";
import { makeAdapter } from "./adapter.ts";
import { createClient, resolveClientConfiguration } from "./client.ts";
import { checkStatus, pendingSnapshot, skillsFromSdk } from "./status.ts";
import { makeTextGeneration } from "./textGeneration.ts";

const driverKind = ProviderDriverKind.make("githubCopilot");
const decodeSettings = Schema.decodeSync(CopilotSettings);
export type CopilotDriverEnv = ProviderHost.ProviderHost | McpProviderSessions.McpProviderSessions;

export const CopilotDriver: ProviderDriver<CopilotSettings, CopilotDriverEnv> = {
  driverKind,
  metadata: { displayName: "GitHub Copilot", supportsMultipleInstances: true },
  configSchema: CopilotSettings,
  defaultConfig: () => decodeSettings({}),
  create: Effect.fn("CopilotDriver.create")(function* ({
    instanceId,
    displayName,
    accentColor,
    environment,
    enabled,
    config,
  }) {
    const host = yield* ProviderHost.ProviderHost;
    const processEnv = yield* mergeProviderInstanceEnvironment(environment);
    const settings = { ...config, enabled };
    const configuration = yield* Effect.try({
      try: () =>
        resolveClientConfiguration({ settings, cwd: host.paths.cwd, environment: processEnv }),
      catch: (cause) =>
        new ProviderDriverError({
          driver: driverKind,
          instanceId,
          detail: "Could not configure Copilot.",
          cause,
        }),
    });
    const continuationIdentity = {
      driverKind,
      continuationKey: `githubCopilot:home:${configuration.effectiveHome}`,
    };
    const stamp = withInstanceIdentity({
      instanceId,
      driverKind,
      displayName,
      accentColor,
      continuationGroupKey: continuationIdentity.continuationKey,
    });
    const workspaceSkills = new Map<string, ReadonlyArray<ServerProviderSkill>>();
    const orchestrationAdapter = yield* makeAdapter(
      { instanceId, settings, environment: processEnv },
      {
        onSkills: (cwd, skills) => {
          if (skills) workspaceSkills.set(cwd, skills);
          else workspaceSkills.delete(cwd);
        },
      },
    );
    const snapshotSettings = yield* makeProviderSnapshotSettingsSource(settings);
    const snapshot = yield* makeManagedServerProvider({
      resolveMaintenance: () =>
        Effect.succeed(
          makeManualOnlyProviderMaintenanceCapabilities({
            provider: driverKind,
            packageName: "@github/copilot-sdk",
          }),
        ),
      getSettings: snapshotSettings.getSettings,
      streamSettings: snapshotSettings.streamSettings,
      haveSettingsChanged: haveProviderSnapshotSettingsChanged,
      initialSnapshot: () => pendingSnapshot(settings).pipe(Effect.map(stamp)),
      checkProvider: checkStatus(settings, host.paths.cwd, processEnv).pipe(Effect.map(stamp)),
    }).pipe(
      Effect.mapError(
        (cause) =>
          new ProviderDriverError({
            driver: driverKind,
            instanceId,
            detail: "Could not build Copilot provider snapshot.",
            cause,
          }),
      ),
    );
    const snapshotForCwd: NonNullable<ProviderInstance["snapshotForCwd"]> = Effect.fn(
      "CopilotDriver.snapshotForCwd",
    )(function* (cwd) {
      const current = yield* snapshot.getSnapshot;
      if (!enabled) return current;
      const cached = workspaceSkills.get(cwd);
      if (cached) return { ...current, skills: cached };
      const skills = yield* Effect.scoped(
        Effect.gen(function* () {
          const client = yield* Effect.acquireRelease(
            Effect.try({
              try: () =>
                createClient(
                  resolveClientConfiguration({ settings, cwd, environment: processEnv }).options,
                ),
              catch: (cause) =>
                new ProviderDriverError({
                  driver: driverKind,
                  instanceId,
                  detail: "Copilot discovery failed.",
                  cause,
                }),
            }),
            (client) =>
              Effect.gen(function* () {
                const stopped = yield* Effect.tryPromise(() => client.stop()).pipe(
                  Effect.timeoutOption(10_000),
                  Effect.result,
                );
                if (
                  stopped._tag === "Failure" ||
                  Option.isNone(stopped.success) ||
                  stopped.success.value.length
                ) {
                  yield* Effect.tryPromise(() => client.forceStop()).pipe(
                    Effect.timeoutOption(5_000),
                    Effect.ignore,
                  );
                }
              }),
          );
          return yield* Effect.tryPromise({
            try: async () => {
              await client.start();
              const discovered = await client.rpc.skills.discover({
                projectPaths: settings.enableConfigDiscovery ? [cwd] : [],
              });
              return skillsFromSdk(discovered.skills);
            },
            catch: (cause) =>
              new ProviderDriverError({
                driver: driverKind,
                instanceId,
                detail: "Copilot workspace skill discovery failed.",
                cause,
              }),
          });
        }),
      ).pipe(
        Effect.timeoutOption(30_000),
        Effect.flatMap((result) =>
          Effect.fromOption(result).pipe(
            Effect.mapError(
              (cause) =>
                new ProviderDriverError({
                  driver: driverKind,
                  instanceId,
                  detail: "Copilot discovery timed out.",
                  cause,
                }),
            ),
          ),
        ),
      );
      return { ...current, skills };
    });
    return {
      instanceId,
      driverKind,
      displayName,
      accentColor,
      enabled,
      continuationIdentity,
      snapshot,
      snapshotForCwd,
      orchestrationAdapter,
      textGeneration: makeTextGeneration(settings, processEnv),
    } satisfies ProviderInstance;
  }),
};
