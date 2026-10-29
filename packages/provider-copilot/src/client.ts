import { ProviderDriverKind } from "@t3tools/contracts";
import { defineProviderClient } from "@t3tools/provider-core/client";
import { CopilotSettings } from "./settings.ts";

export const copilotClient = defineProviderClient({
  driverKind: ProviderDriverKind.make("githubCopilot"),
  label: "GitHub Copilot",
  settingsSchema: CopilotSettings,
  icon: {
    viewBox: "0 0 24 24",
    fill: { light: "#24292f", dark: "#f0f6fc" },
    paths: [
      {
        d: "M8 3a5 5 0 0 0-5 5v2H2v7h2v2c4 3 12 3 16 0v-2h2v-7h-1V8a5 5 0 0 0-5-5c-1.6 0-3 .6-4 1.7A5.4 5.4 0 0 0 8 3Zm0 2c2 0 3 1 3 3v2H5V8c0-2 1-3 3-3Zm8 0c2 0 3 1 3 3v2h-6V8c0-2 1-3 3-3ZM6 12h12v6c-3.5 2-8.5 2-12 0Zm2 2v3h2v-3Zm6 0v3h2v-3Z",
      },
    ],
  },
});
