import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";
import { ClientSettingsPatch, ServerSettings, ServerSettingsPatch } from "./settings.ts";
import { TwsContextQuery, TwsContextSetInput, TwsTopologyQuery } from "./twsContext.ts";

const settings = Schema.decodeUnknownSync(ServerSettings);
const serverPatch = Schema.decodeUnknownSync(ServerSettingsPatch);
const clientPatch = Schema.decodeUnknownSync(ClientSettingsPatch);
const contextQuery = Schema.decodeUnknownSync(TwsContextQuery);
const contextSet = Schema.decodeUnknownSync(TwsContextSetInput);
const topologyQuery = Schema.decodeUnknownSync(TwsTopologyQuery);
describe("optional TWS contracts", () => {
  it("defaults off per environment and does not reset or create client-local preferences", () => {
    expect(settings({}).twsIntegrationEnabled).toBe(false);
    expect(serverPatch({})).not.toHaveProperty("twsIntegrationEnabled");
    expect(serverPatch({ twsIntegrationEnabled: true })).toEqual({ twsIntegrationEnabled: true });
    expect(clientPatch({ twsIntegrationEnabled: true })).not.toHaveProperty(
      "twsIntegrationEnabled",
    );
    expect(() => serverPatch({ twsIntegrationEnabled: "true" })).toThrow();
  });
  it("bounds queries and never accepts a path or environment as context authority", () => {
    expect(() =>
      contextQuery({ threadIds: Array.from({ length: 101 }, (_, index) => `thread-${index}`) }),
    ).toThrow();
    expect(() => topologyQuery({ limit: 101 })).toThrow();
    expect(
      contextSet({
        threadId: "thread",
        expectedRevision: 1,
        choice: { mode: "none" },
        cwd: "/untrusted",
        environmentId: "other",
      }),
    ).toEqual({ threadId: "thread", expectedRevision: 1, choice: { mode: "none" } });
    expect(() =>
      contextSet({ threadId: "thread", expectedRevision: -1, choice: { mode: "auto" } }),
    ).toThrow();
    expect(() =>
      contextSet({ threadId: "thread", expectedRevision: 1, choice: { mode: "explicit" } }),
    ).toThrow();
  });
});
