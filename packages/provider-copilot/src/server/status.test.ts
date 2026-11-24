import { assert, describe, it } from "@effect/vitest";
import type { ModelInfo, SkillsLoadedSkill } from "@github/copilot-sdk";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { CopilotSettings } from "../settings.ts";
import { checkStatus, modelsFromSdk, skillsFromSdk } from "./status.ts";
import { bundledCliPath, resolveClientConfiguration } from "./client.ts";

const decode = Schema.decodeSync(CopilotSettings);
const model = (id: string, extra: Partial<ModelInfo> = {}): ModelInfo => ({
  id,
  name: id,
  capabilities: {
    supports: { vision: true, reasoningEffort: true },
    limits: { max_context_window_tokens: 128_000 },
  },
  ...extra,
});
const skill = (
  name: string,
  source: SkillsLoadedSkill["source"],
  extra: Partial<SkillsLoadedSkill> = {},
): SkillsLoadedSkill => ({
  name,
  source,
  description: `${name} skill`,
  enabled: true,
  userInvocable: true,
  path: `/workspace/${name}/SKILL.md`,
  ...extra,
});

describe("Copilot discovery and account isolation", () => {
  it("keeps project/native skills in workspace results, including pathless built-ins", () => {
    const skills = skillsFromSdk([
      skill("project-skill", "project"),
      skill("personal-skill", "personal-copilot"),
      skill("builtin", "builtin", { path: "" }),
      skill("disabled", "project", { enabled: false }),
      skill("agent-only", "project", { userInvocable: false }),
      skill("project-skill", "personal-agents"),
    ]);
    assert.deepEqual(
      skills.map((entry) => entry.name),
      ["project-skill", "personal-skill", "builtin"],
    );
    assert.equal(skills[0]?.scope, "project");
    assert.equal(skills[2]?.path, "copilot://skills/builtin");
  });

  it("discovers allowed models and reasoning options without duplicates or policy-disabled models", () => {
    const result = modelsFromSdk(
      [
        model("gpt", {
          supportedReasoningEfforts: ["low", "high"],
          defaultReasoningEffort: "high",
        }),
        model("gpt"),
        model("blocked", { policy: { state: "disabled", terms: "" } }),
      ],
      decode({ customModels: ["custom"] }),
    );
    assert.deepEqual(
      result.map((entry) => entry.slug),
      ["gpt", "custom"],
    );
    assert.deepEqual(result[0]?.capabilities?.optionDescriptors?.[0], {
      id: "reasoningEffort",
      label: "Reasoning",
      type: "select",
      currentValue: "high",
      options: [
        { id: "low", label: "Low" },
        { id: "high", label: "High", isDefault: true },
      ],
    });
  });

  it("uses only the selected account's home and preserves SDK-owned native paths", () => {
    const first = resolveClientConfiguration({
      settings: decode({ homePath: "~/.copilot-work" }),
      cwd: "/workspace",
      environment: { HOME: "/accounts/first", COPILOT_HOME: "/ignored", GITHUB_TOKEN: "first" },
    });
    const second = resolveClientConfiguration({
      settings: decode({}),
      cwd: "/workspace",
      environment: { HOME: "/accounts/second", COPILOT_HOME: "/native/second" },
    });
    assert.equal(first.effectiveHome, "/accounts/first/.copilot-work");
    assert.equal(first.options.mode, "copilot-cli");
    assert.equal(first.options.baseDirectory, first.effectiveHome);
    assert.equal(first.options.env?.COPILOT_HOME, first.effectiveHome);
    assert.equal(second.effectiveHome, "/native/second");
    assert.isUndefined(second.options.env?.GITHUB_TOKEN);
  });

  it("resolves packaged Windows executables outside asar and Linux libc alternatives", () => {
    assert.equal(
      bundledCliPath({
        packaged: true,
        electron: true,
        platform: "win32",
        architecture: "x64",
        resolve: () => "C:\\T3\\app.asar\\node_modules\\@github\\copilot-win32-x64\\copilot.exe",
        exists: (path) => path.includes("app.asar.unpacked"),
      }),
      "C:\\T3\\app.asar.unpacked\\node_modules\\@github\\copilot-win32-x64\\copilot.exe",
    );
    assert.equal(
      bundledCliPath({
        packaged: true,
        electron: false,
        platform: "linux",
        architecture: "arm64",
        resolve: (name) => {
          if (!name.includes("linuxmusl")) throw new Error("not installed");
          return "/native/copilot";
        },
        exists: () => true,
      }),
      "/native/copilot",
    );
  });

  it.effect("returns authenticated SDK models without exposing any workspace skills globally", () =>
    Effect.gen(function* () {
      let stops = 0;
      const result = yield* checkStatus(
        decode({ enabled: true }),
        "/workspace",
        { HOME: "/account" },
        () => ({
          start: async () => {},
          stop: async () => {
            stops++;
            return [];
          },
          forceStop: async () => {},
          getStatus: async () => ({ version: "1.0.75", protocolVersion: 1 }),
          getAuthStatus: async () => ({ isAuthenticated: true, login: "octocat" }),
          listModels: async () => [model("gpt")],
        }),
      );
      assert.equal(result.status, "ready");
      assert.equal(result.auth.label, "octocat");
      assert.equal(result.models[0]?.slug, "gpt");
      assert.deepEqual(result.skills, []);
      assert.equal(stops, 1);
    }),
  );

  it.effect(
    "reports cleanup-only failures and preserves a primary probe failure when cleanup also fails",
    () =>
      Effect.gen(function* () {
        for (const failProbe of [false, true]) {
          let forced = 0;
          const snapshot = yield* checkStatus(decode({ enabled: true }), "/workspace", {}, () => ({
            start: async () => {},
            stop: async () => {
              throw new Error("stop failed");
            },
            forceStop: async () => {
              forced++;
            },
            getStatus: async () => {
              if (failProbe) throw new Error("probe failed");
              return { version: "1.0.75", protocolVersion: 1 };
            },
            getAuthStatus: async () => ({ isAuthenticated: true }),
            listModels: async () => [],
          }));
          assert.equal(snapshot.status, "error");
          assert.equal(forced, 1);
          assert.equal(
            snapshot.message,
            failProbe ? "GitHub Copilot status check failed." : "GitHub Copilot cleanup failed.",
          );
        }
      }),
  );
});
