import type {
  CopilotClient,
  CopilotClientOptions,
  CopilotSession,
  SessionConfig,
} from "@github/copilot-sdk";
import { TextGenerationError } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as TextGenerationOperations from "@t3tools/provider-core/server/textGenerationOperations";
import type { CopilotSettings } from "../settings.ts";
import { createClient, resolveClientConfiguration } from "./client.ts";
import { reasoningEffort } from "./adapter.ts";

type GenerationSession = Pick<CopilotSession, "sessionId" | "sendAndWait" | "disconnect">;
type GenerationClient = Pick<CopilotClient, "start" | "stop" | "forceStop" | "deleteSession"> & {
  readonly createSession: (config: SessionConfig) => Promise<GenerationSession>;
};
export interface GenerationOptions {
  readonly clientFactory?: (options: CopilotClientOptions) => GenerationClient;
}

export function makeTextGeneration(
  settings: CopilotSettings,
  environment: NodeJS.ProcessEnv,
  options: GenerationOptions = {},
) {
  const run: TextGenerationOperations.Runner = Effect.fn("CopilotTextGeneration.run")(
    function* (request) {
      const error = (cause?: unknown) =>
        new TextGenerationError({
          operation: request.operation,
          detail: "GitHub Copilot text generation failed.",
          cause,
        });
      let cleanupFailed = false;
      let forceRequired = false;
      const generated = yield* Effect.scoped(
        Effect.gen(function* () {
          const client = yield* Effect.try({
            try: () =>
              (options.clientFactory ?? createClient)(
                resolveClientConfiguration({ settings, cwd: request.cwd, environment }).options,
              ),
            catch: error,
          });
          let session: GenerationSession | undefined;
          let finalized = false;
          const call = <A>(stage: string, operation: () => Promise<A>, timeoutMs: number) =>
            Effect.tryPromise({ try: operation, catch: error }).pipe(
              Effect.timeoutOption(timeoutMs),
              Effect.flatMap((result) =>
                Effect.fromOption(result).pipe(
                  Effect.mapError(() => {
                    forceRequired = true;
                    return new TextGenerationError({
                      operation: request.operation,
                      detail: `GitHub Copilot text generation ${stage} timed out.`,
                    });
                  }),
                ),
              ),
            );
          const cleanup = <A>(operation: () => Promise<A>, timeoutMs = 5_000) =>
            Effect.tryPromise(operation).pipe(Effect.timeoutOption(timeoutMs), Effect.result);
          yield* Effect.addFinalizer(() =>
            Effect.gen(function* () {
              if (finalized) return;
              finalized = true;
              const owned = session;
              session = undefined;
              if (owned) {
                const disconnected = yield* cleanup(() => owned.disconnect());
                const deleted = yield* cleanup(() => client.deleteSession(owned.sessionId));
                if (
                  disconnected._tag === "Failure" ||
                  Option.isNone(disconnected.success) ||
                  deleted._tag === "Failure" ||
                  Option.isNone(deleted.success)
                )
                  cleanupFailed = true;
              }
              const stopped = yield* cleanup(() => client.stop(), 10_000);
              if (
                stopped._tag === "Failure" ||
                Option.isNone(stopped.success) ||
                stopped.success.value.length
              ) {
                cleanupFailed = true;
              }
              if (cleanupFailed || forceRequired) yield* cleanup(() => client.forceStop());
            }),
          );
          yield* call("startup", () => client.start(), 30_000);
          const effort = reasoningEffort(request.modelSelection);
          const owned = yield* call(
            "session creation",
            () =>
              client
                .createSession({
                  clientName: "t3-code-text-generation",
                  workingDirectory: request.cwd,
                  model: request.modelSelection.model,
                  ...(effort ? { reasoningEffort: effort } : {}),
                  streaming: false,
                  enableConfigDiscovery: false,
                  enableSkills: false,
                  availableTools: [],
                  mcpServers: {},
                  customAgents: [],
                  skipCustomInstructions: true,
                  requestExtensions: false,
                  requestCanvasRenderer: false,
                  enableMcpApps: false,
                  manageScheduleEnabled: false,
                  infiniteSessions: { enabled: false },
                  onPermissionRequest: () => ({ kind: "reject" }),
                })
                .then(async (created) => {
                  if (finalized) {
                    try {
                      await created.disconnect();
                    } finally {
                      await client.deleteSession(created.sessionId);
                    }
                    throw new Error("Copilot session creation completed after cancellation.");
                  }
                  session = created;
                  return created;
                }),
            30_000,
          );
          const reply = yield* call(
            "response",
            () => owned.sendAndWait({ prompt: request.prompt }, 180_000),
            180_000,
          );
          const output = reply?.data.content ?? "";
          if (output.length > 20_000)
            return yield* new TextGenerationError({
              operation: request.operation,
              detail: "GitHub Copilot returned oversized structured output.",
            });
          return yield* TextGenerationOperations.decodeJsonReply(request, "GitHub Copilot", output);
        }),
      );
      if (cleanupFailed)
        return yield* new TextGenerationError({
          operation: request.operation,
          detail: "GitHub Copilot text generation cleanup failed.",
        });
      return generated;
    },
  );
  return TextGenerationOperations.fromRunner(
    "CopilotTextGeneration",
    TextGenerationOperations.withoutInvestigation("GitHub Copilot", run),
  );
}
