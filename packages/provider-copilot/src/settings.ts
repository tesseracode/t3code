import {
  CustomModelSetting,
  TrimmedString,
  makeBinaryPathSetting,
  makeProviderSettingsSchema,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

export const CopilotSettings = makeProviderSettingsSchema(
  {
    enabled: Schema.Boolean.pipe(
      Schema.withDecodingDefault(Effect.succeed(false)),
      Schema.annotateKey({ providerSettingsForm: { hidden: true } }),
    ),
    binaryPath: makeBinaryPathSetting("copilot").pipe(
      Schema.annotateKey({
        title: "Binary path",
        description: "Optional CLI override. Leave as copilot to use the SDK's bundled executable.",
        providerSettingsForm: { placeholder: "copilot", clearWhenEmpty: "omit" },
      }),
    ),
    homePath: TrimmedString.pipe(
      Schema.withDecodingDefault(Effect.succeed("")),
      Schema.annotateKey({
        title: "COPILOT_HOME path",
        description: "Copilot account, session and configuration directory.",
        providerSettingsForm: { placeholder: "~/.copilot", clearWhenEmpty: "omit" },
      }),
    ),
    enableConfigDiscovery: Schema.Boolean.pipe(
      Schema.withDecodingDefault(Effect.succeed(true)),
      Schema.annotateKey({
        title: "Discover project configuration",
        description: "Load project MCP servers, skills and instructions.",
        providerSettingsForm: { control: "switch" },
      }),
    ),
    customModels: Schema.Array(CustomModelSetting).pipe(
      Schema.withDecodingDefault(Effect.succeed([])),
      Schema.annotateKey({ providerSettingsForm: { hidden: true } }),
    ),
  },
  { order: ["binaryPath", "homePath", "enableConfigDiscovery"] },
);
export type CopilotSettings = typeof CopilotSettings.Type;
