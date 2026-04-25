/**
 * CopilotProviderLive - Provider snapshot for GitHub Copilot.
 *
 * Uses @github/copilot-sdk to detect installation, authentication, and
 * available models. Produces a ServerProvider snapshot with runtime models.
 *
 * @module CopilotProviderLive
 */
import { normalizeCopilotCliPathOverride, resolveBundledCopilotCliPath } from "./copilotCliPath.ts";
import { getCopilotDiscoveredSkills } from "./CopilotAdapter.ts";
import type {
  ModelCapabilities,
  ServerProvider,
  ServerProviderModel,
  CopilotSettings,
} from "@t3tools/contracts";
import { Effect, Equal, Layer, Stream } from "effect";

import { buildServerProvider } from "../providerSnapshot.ts";
import { makeManagedServerProvider } from "../makeManagedServerProvider.ts";
import { CopilotProvider } from "../Services/CopilotProvider.ts";
import { ServerSettingsService } from "../../serverSettings.ts";

const PROVIDER = "copilot" as const;

interface CopilotProviderClientHandle {
  start(): Promise<void>;
  listModels(): Promise<ReadonlyArray<unknown>>;
  stop(): Promise<unknown>;
  readonly rpc?: {
    readonly account?: {
      readonly getQuota?: () => Promise<unknown>;
    };
  };
}

export interface CopilotProviderCheckOptions {
  readonly clientFactory?: (options: Record<string, unknown>) => CopilotProviderClientHandle;
}

interface CopilotProviderStatusCheckError {
  readonly _tag: "CopilotProviderStatusCheckError";
  readonly message: string;
  readonly cause: unknown;
}

const DEFAULT_COPILOT_MODEL_CAPABILITIES: ModelCapabilities = {
  reasoningEffortLevels: [],
  supportsFastMode: false,
  supportsThinkingToggle: false,
  contextWindowOptions: [],
  promptInjectedEffortLevels: [],
};

const GPT_MODEL_CAPABILITIES: ModelCapabilities = {
  reasoningEffortLevels: [
    { value: "xhigh", label: "Extra High" },
    { value: "high", label: "High", isDefault: true },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ],
  supportsFastMode: false,
  supportsThinkingToggle: false,
  contextWindowOptions: [],
  promptInjectedEffortLevels: [],
};

const EFFORT_LABEL_MAP: Record<string, string> = {
  xhigh: "Extra High",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const DEFAULT_EFFORT = "high";

/**
 * Build ModelCapabilities dynamically from SDK model info.
 * Uses `supportedReasoningEfforts` from the SDK response to populate
 * effort levels, instead of hardcoding per model family.
 */
function buildCapabilitiesFromSdkModel(info: any): ModelCapabilities {
  const efforts: string[] = info.supportedReasoningEfforts ?? [];
  const defaultEffort: string | undefined = info.defaultReasoningEffort;

  if (efforts.length === 0) {
    return DEFAULT_COPILOT_MODEL_CAPABILITIES;
  }

  return {
    reasoningEffortLevels: efforts.map((value: string) => ({
      value,
      label: EFFORT_LABEL_MAP[value] ?? value.charAt(0).toUpperCase() + value.slice(1),
      ...(value === (defaultEffort ?? DEFAULT_EFFORT) ? { isDefault: true } : {}),
    })),
    supportsFastMode: false,
    supportsThinkingToggle: false,
    contextWindowOptions: [],
    promptInjectedEffortLevels: [],
  };
}

const CLAUDE_EFFORT_CAPABILITIES: ModelCapabilities = {
  reasoningEffortLevels: [
    { value: "high", label: "High", isDefault: true },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ],
  supportsFastMode: false,
  supportsThinkingToggle: false,
  contextWindowOptions: [],
  promptInjectedEffortLevels: [],
};

const CLAUDE_OPUS_47_CAPABILITIES: ModelCapabilities = {
  reasoningEffortLevels: [{ value: "medium", label: "Medium", isDefault: true }],
  supportsFastMode: false,
  supportsThinkingToggle: false,
  contextWindowOptions: [],
  promptInjectedEffortLevels: [],
};

const BUILT_IN_MODELS: ReadonlyArray<ServerProviderModel> = [
  {
    slug: "gpt-5.4",
    name: "GPT-5.4",
    isCustom: false,
    capabilities: GPT_MODEL_CAPABILITIES,
  },
  {
    slug: "gpt-5.4-mini",
    name: "GPT-5.4 Mini",
    isCustom: false,
    capabilities: GPT_MODEL_CAPABILITIES,
  },
  {
    slug: "gpt-5.3-codex",
    name: "GPT-5.3 Codex",
    isCustom: false,
    capabilities: GPT_MODEL_CAPABILITIES,
  },
  {
    slug: "gpt-5.2-codex",
    name: "GPT-5.2 Codex",
    isCustom: false,
    capabilities: GPT_MODEL_CAPABILITIES,
  },
  {
    slug: "gpt-5.2",
    name: "GPT-5.2",
    isCustom: false,
    capabilities: GPT_MODEL_CAPABILITIES,
  },
  {
    slug: "gpt-5-mini",
    name: "GPT-5 Mini",
    isCustom: false,
    capabilities: GPT_MODEL_CAPABILITIES,
  },
  {
    slug: "gpt-4.1",
    name: "GPT-4.1",
    isCustom: false,
    capabilities: DEFAULT_COPILOT_MODEL_CAPABILITIES,
  },
  {
    slug: "claude-sonnet-4.6",
    name: "Claude Sonnet 4.6",
    isCustom: false,
    capabilities: CLAUDE_EFFORT_CAPABILITIES,
  },
  {
    slug: "claude-opus-4.7",
    name: "Claude Opus 4.7",
    isCustom: false,
    capabilities: CLAUDE_OPUS_47_CAPABILITIES,
  },
  {
    slug: "claude-opus-4.6",
    name: "Claude Opus 4.6",
    isCustom: false,
    capabilities: CLAUDE_EFFORT_CAPABILITIES,
  },
  {
    slug: "claude-opus-4.5",
    name: "Claude Opus 4.5",
    isCustom: false,
    capabilities: DEFAULT_COPILOT_MODEL_CAPABILITIES,
  },
  {
    slug: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    isCustom: false,
    capabilities: DEFAULT_COPILOT_MODEL_CAPABILITIES,
  },
  {
    slug: "claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    isCustom: false,
    capabilities: DEFAULT_COPILOT_MODEL_CAPABILITIES,
  },
  {
    slug: "claude-sonnet-4",
    name: "Claude Sonnet 4",
    isCustom: false,
    capabilities: DEFAULT_COPILOT_MODEL_CAPABILITIES,
  },
  {
    slug: "gemini-3.1-pro",
    name: "Gemini 3.1 Pro",
    isCustom: false,
    capabilities: DEFAULT_COPILOT_MODEL_CAPABILITIES,
  },
];

const makePendingCopilotProvider = (): ServerProvider =>
  buildServerProvider({
    provider: PROVIDER,
    enabled: false,
    checkedAt: new Date().toISOString(),
    models: BUILT_IN_MODELS,
    probe: {
      installed: false,
      version: null,
      status: "error",
      auth: { status: "unknown" },
      message: "Checking GitHub Copilot availability...",
    },
  });

const makeErrorProvider = (message: string): ServerProvider =>
  buildServerProvider({
    provider: PROVIDER,
    enabled: false,
    checkedAt: new Date().toISOString(),
    models: BUILT_IN_MODELS,
    probe: {
      installed: false,
      version: null,
      status: "error",
      auth: { status: "unknown" },
      message,
    },
  });

/**
 * Check Copilot provider status using the SDK.
 */
export const checkCopilotProviderStatus = Effect.fn("checkCopilotProviderStatus")(function* (
  settings: CopilotSettings,
  options?: CopilotProviderCheckOptions,
) {
  const now = new Date().toISOString();

  if (!settings.enabled) {
    return buildServerProvider({
      provider: PROVIDER,
      enabled: false,
      checkedAt: now,
      models: BUILT_IN_MODELS,
      probe: {
        installed: false,
        version: null,
        status: "error",
        auth: { status: "unknown" },
        message: "GitHub Copilot provider is disabled.",
      },
    });
  }

  // Attempt SDK-based detection
  const sdkResult = yield* Effect.tryPromise({
    try: async () => {
      const { CopilotClient } = await import("@github/copilot-sdk");
      const cliPath =
        normalizeCopilotCliPathOverride(settings.binaryPath) ?? resolveBundledCopilotCliPath();
      const clientOptions: Record<string, unknown> = { logLevel: "error" };
      if (cliPath) {
        clientOptions.cliPath = cliPath;
      }
      const client =
        options?.clientFactory?.(clientOptions) ?? new CopilotClient(clientOptions as any);
      await client.start();
      try {
        const [models, quota] = await Promise.all([
          client.listModels().catch(() => [] as any[]),
          client.rpc?.account?.getQuota?.().catch(() => null),
        ]);
        return { started: true, models, quota, error: null as string | null };
      } finally {
        await client.stop().catch(() => {});
      }
    },
    catch: (cause: unknown): CopilotProviderStatusCheckError => ({
      _tag: "CopilotProviderStatusCheckError",
      message: cause instanceof Error ? cause.message : String(cause),
      cause,
    }),
  }).pipe(
    Effect.catchTag("CopilotProviderStatusCheckError", (error) =>
      Effect.succeed({
        started: false,
        models: [] as ReadonlyArray<unknown>,
        quota: null,
        error: error.message,
      }),
    ),
  );

  if (!sdkResult.started) {
    const errorMsg = sdkResult.error ?? "Unknown error";
    const isAuthError =
      errorMsg.toLowerCase().includes("unauthenticated") ||
      errorMsg.toLowerCase().includes("unauthorized");

    return buildServerProvider({
      provider: PROVIDER,
      enabled: false,
      checkedAt: now,
      models: BUILT_IN_MODELS,
      probe: {
        installed: !errorMsg.includes("Cannot find module"),
        version: null,
        status: "error",
        auth: { status: isAuthError ? "unauthenticated" : "unknown" },
        message: isAuthError
          ? "GitHub Copilot is not authenticated. Sign in via your IDE or GitHub CLI."
          : `GitHub Copilot SDK error: ${errorMsg}`,
      },
    });
  }

  // Build models from SDK response, fall back to built-in
  const allModels: ServerProviderModel[] =
    sdkResult.models.length > 0
      ? sdkResult.models.map((info: any) => ({
          slug: info.id ?? info.slug ?? info.name,
          name: info.name ?? info.id ?? info.slug,
          isCustom: false,
          capabilities: buildCapabilitiesFromSdkModel(info),
        }))
      : [...BUILT_IN_MODELS];

  // Filter out internal-only models when the setting is enabled
  const runtimeModels = settings.hideInternalModels
    ? allModels.filter((model) => !model.name.toLowerCase().includes("internal only"))
    : allModels;

  return buildServerProvider({
    provider: PROVIDER,
    enabled: true,
    checkedAt: now,
    models: runtimeModels,
    skills: [...getCopilotDiscoveredSkills()],
    probe: {
      installed: true,
      version: null,
      status: "ready",
      auth: { status: "authenticated" },
    },
  });
});

export const CopilotProviderLive = Layer.effect(
  CopilotProvider,
  Effect.gen(function* () {
    const serverSettings = yield* ServerSettingsService;

    const checkProvider = Effect.gen(function* () {
      const settings = yield* serverSettings.getSettings;
      return yield* checkCopilotProviderStatus(settings.providers.copilot);
    }).pipe(Effect.orElseSucceed(() => makeErrorProvider("Failed to check Copilot status")));

    return yield* makeManagedServerProvider<CopilotSettings>({
      getSettings: serverSettings.getSettings.pipe(
        Effect.map((settings) => settings.providers.copilot),
        Effect.orDie,
      ),
      streamSettings: serverSettings.streamChanges.pipe(
        Stream.map((settings) => settings.providers.copilot),
      ),
      haveSettingsChanged: (previous, next) => !Equal.equals(previous, next),
      initialSnapshot: makePendingCopilotProvider,
      checkProvider,
      refreshInterval: "120 seconds",
    });
  }),
);
