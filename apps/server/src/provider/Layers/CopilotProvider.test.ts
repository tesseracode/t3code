import { DEFAULT_SERVER_SETTINGS } from "@t3tools/contracts";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { checkCopilotProviderStatus } from "./CopilotProvider.ts";

describe("checkCopilotProviderStatus", () => {
  it("preserves the underlying SDK startup error message", async () => {
    const provider = await Effect.runPromise(
      checkCopilotProviderStatus(
        {
          ...DEFAULT_SERVER_SETTINGS.providers.copilot,
          enabled: true,
        },
        {
          clientFactory: () => ({
            start: async () => {
              throw new Error("spawn copilot ENOENT");
            },
            listModels: async () => [],
            stop: async () => [],
            rpc: {},
          }),
        },
      ),
    );

    expect(provider.enabled).toBe(false);
    expect(provider.message).toBe("GitHub Copilot SDK error: spawn copilot ENOENT");
  });
});
