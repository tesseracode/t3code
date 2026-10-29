import type { CopilotClient, ModelInfo, SkillsLoadedSkill } from "@github/copilot-sdk";
import type { ServerProviderSkill } from "@t3tools/contracts";
import { createModelCapabilities } from "@t3tools/shared/model";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import {
  buildSelectOptionDescriptor,
  buildServerProvider,
  providerModelsFromSettings,
} from "@t3tools/provider-core/server/snapshotProbe";
import type { CopilotSettings } from "../settings.ts";
import { createClient, resolveClientConfiguration } from "./client.ts";

const presentation = {
  displayName: "GitHub Copilot",
  badgeLabel: "Preview",
  showInteractionModeToggle: true,
  supportsConversationRollback: false,
};
const emptyCapabilities = createModelCapabilities({ optionDescriptors: [] });

export function modelsFromSdk(models: ReadonlyArray<ModelInfo>, settings: CopilotSettings) {
  const seen = new Set<string>();
  return providerModelsFromSettings(
    models.flatMap((model) => {
      const slug = model.id.trim();
      if (!slug || !model.name.trim() || seen.has(slug) || model.policy?.state === "disabled")
        return [];
      seen.add(slug);
      const efforts = model.supportedReasoningEfforts ?? [];
      return [
        {
          slug,
          name: model.name,
          isCustom: false,
          ...(seen.size === 1 ? { isDefault: true } : {}),
          capabilities: createModelCapabilities({
            optionDescriptors: efforts.length
              ? [
                  buildSelectOptionDescriptor({
                    id: "reasoningEffort",
                    label: "Reasoning",
                    options: efforts.map((effort) => ({
                      value: effort,
                      label:
                        effort === "xhigh"
                          ? "Extra High"
                          : effort[0]!.toUpperCase() + effort.slice(1),
                      isDefault: effort === model.defaultReasoningEffort,
                    })),
                  }),
                ]
              : [],
          }),
        },
      ];
    }),
    settings.customModels,
    emptyCapabilities,
  );
}

// Workspace snapshots are requested with a cwd; no project skills enter the instance snapshot.
export function skillsFromSdk(
  skills: ReadonlyArray<SkillsLoadedSkill>,
): ReadonlyArray<ServerProviderSkill> {
  const seen = new Set<string>();
  return skills.flatMap((skill) => {
    const name = skill.name.trim();
    if (!name || !skill.enabled || !skill.userInvocable || seen.has(name)) return [];
    seen.add(name);
    return [
      {
        name,
        ...(skill.description.trim() ? { description: skill.description } : {}),
        path: skill.path?.trim() || `copilot://skills/${encodeURIComponent(name)}`,
        enabled: true,
        scope: skill.source,
        userInvocable: true,
      },
    ];
  });
}

export const pendingSnapshot = (settings: CopilotSettings) =>
  DateTime.now.pipe(
    Effect.map((now) =>
      buildServerProvider({
        presentation,
        enabled: settings.enabled,
        checkedAt: DateTime.formatIso(now),
        models: modelsFromSdk([], settings),
        probe: {
          installed: false,
          version: null,
          status: "warning",
          auth: { status: "unknown" },
          message: settings.enabled
            ? "Checking GitHub Copilot availability..."
            : "GitHub Copilot is disabled.",
        },
      }),
    ),
  );

export type StatusClient = Pick<
  CopilotClient,
  "start" | "stop" | "forceStop" | "getStatus" | "getAuthStatus" | "listModels"
>;

export const checkStatus = Effect.fn("Copilot.checkStatus")(function* (
  settings: CopilotSettings,
  cwd: string,
  environment: NodeJS.ProcessEnv,
  factory: (
    options: ReturnType<typeof resolveClientConfiguration>["options"],
  ) => StatusClient = createClient,
) {
  if (!settings.enabled) return yield* pendingSnapshot(settings);
  let started = false;
  let cleanupFailed = false;
  const checkedAt = DateTime.formatIso(yield* DateTime.now);
  const result = yield* Effect.scoped(
    Effect.gen(function* () {
      const client = yield* Effect.acquireRelease(
        Effect.try(() =>
          factory(resolveClientConfiguration({ settings, cwd, environment }).options),
        ),
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
              cleanupFailed = true;
              yield* Effect.tryPromise(() => client.forceStop()).pipe(
                Effect.timeoutOption(5_000),
                Effect.ignore,
              );
            }
          }),
      );
      return yield* Effect.tryPromise(async () => {
        await client.start();
        started = true;
        const [status, auth] = await Promise.all([client.getStatus(), client.getAuthStatus()]);
        const models = auth.isAuthenticated ? await client.listModels() : [];
        return { status, auth, models };
      });
    }),
  ).pipe(Effect.timeoutOption(30_000), Effect.result);
  if (result._tag === "Failure" || Option.isNone(result.success) || cleanupFailed) {
    return buildServerProvider({
      presentation,
      enabled: true,
      checkedAt,
      models: modelsFromSdk([], settings),
      probe: {
        installed: started,
        version: null,
        status: "error",
        auth: { status: "unknown" },
        message:
          cleanupFailed && result._tag === "Success" && Option.isSome(result.success)
            ? "GitHub Copilot cleanup failed."
            : started
              ? "GitHub Copilot status check failed."
              : "Unable to start the Copilot CLI.",
      },
    });
  }
  const { status, auth, models } = result.success.value;
  return buildServerProvider({
    presentation,
    enabled: true,
    checkedAt,
    models: modelsFromSdk(models, settings),
    probe: {
      installed: true,
      version: status.version,
      status: auth.isAuthenticated ? "ready" : "error",
      auth: auth.isAuthenticated
        ? { status: "authenticated", ...(auth.login ? { label: auth.login } : {}) }
        : { status: "unauthenticated" },
      ...(!auth.isAuthenticated
        ? { message: "Sign in with `copilot login` in this provider's account environment." }
        : {}),
    },
  });
});
