import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { decodeTwsStackStatus, decodeTwsStatus } from "./TwsCliDecoder.ts";
import { normalizeTwsStack, normalizeTwsStatus } from "./TwsTopology.ts";

const encode = Schema.encodeSync(Schema.fromJsonString(Schema.Unknown));
const feature = {
  feature: "feature",
  path: "/repo/.tws/features/feature",
  stack_state: "ok",
  entries: [{ name: "node", git_branch: "feature/node" }],
};
const status = {
  schema_version: 1,
  generated_at: "2026-09-30T00:00:00Z",
  workspace: { mode: "checkout", repo_root: "/repo", metadata_root: "/repo/.tws", degraded: false },
  features: [feature],
  issues: [],
  summary: { features: 1, entries: 1 },
};
const stack = {
  schema_version: 1,
  feature: "feature",
  workspace: {
    mode: "checkout",
    metadata_root: "/repo/.tws",
    repository: { dir: "/repo" },
    checkout: { path: "/repo", branch: "feature/node", detached: false },
  },
  entries: [
    {
      name: "node",
      git_branch: "feature/node",
      archived: false,
      repo: null,
      ref_exists: true,
      is_current_checkout: true,
      materialization: {
        kind: "ref",
        state: "present",
        path: null,
        checked_out_branch: null,
        detached: null,
      },
    },
  ],
  summary: { entries: 1 },
};
describe("public TWS topology normalization", () => {
  it.effect("requires an exact current checkout, never a branch or agent-state hint alone", () =>
    Effect.gen(function* () {
      const workspace = normalizeTwsStatus(yield* decodeTwsStatus(encode(status)))!;
      const report = yield* decodeTwsStackStatus(encode(stack));
      expect(normalizeTwsStack(workspace, workspace.features[0]!, report)?.[0]?.executionPath).toBe(
        "/repo",
      );
      for (const patch of [
        { is_current_checkout: false, agent_state: "working" },
        { archived: true },
        { repo: "another-repository" },
        { ref_exists: null },
      ]) {
        const changed = yield* decodeTwsStackStatus(
          encode({ ...stack, entries: [{ ...stack.entries[0], ...patch }] }),
        );
        expect(
          normalizeTwsStack(workspace, workspace.features[0]!, changed)?.[0]?.executionPath,
        ).toBeNull();
      }
    }),
  );
  it.effect("rejects cross-scope, changed and partially decoded stack reports", () =>
    Effect.gen(function* () {
      const workspace = normalizeTwsStatus(yield* decodeTwsStatus(encode(status)))!;
      for (const changed of [
        { ...stack, feature: "other" },
        { ...stack, summary: { entries: 100 } },
        { ...stack, workspace: { ...stack.workspace, metadata_root: "/other" } },
        { ...stack, entries: [{ ...stack.entries[0], git_branch: "other" }] },
        { ...stack, entries: [{ ...stack.entries[0], materialization: { kind: "ref" } }] },
      ]) {
        expect(
          normalizeTwsStack(
            workspace,
            workspace.features[0]!,
            yield* decodeTwsStackStatus(encode(changed)),
          ),
        ).toBeNull();
      }
    }),
  );
  it.effect(
    "distinguishes complete scopes from missing fields, duplicate names and count truncation",
    () =>
      Effect.gen(function* () {
        for (const raw of [
          { ...status, summary: { features: 2, entries: 1 } },
          { ...status, features: [feature, feature], summary: { features: 2, entries: 2 } },
          {
            ...status,
            features: [feature, { feature: "bad" }],
            summary: { features: 2, entries: 1 },
          },
        ]) {
          const parsed = normalizeTwsStatus(yield* decodeTwsStatus(encode(raw)))!;
          expect(parsed.complete).toBe(false);
        }
        const duplicated = normalizeTwsStatus(
          yield* decodeTwsStatus(
            encode({
              ...status,
              features: [feature, feature],
              summary: { features: 2, entries: 2 },
            }),
          ),
        )!;
        expect(duplicated.features[0]?.complete).toBe(false);
        expect(
          normalizeTwsStatus(yield* decodeTwsStatus(encode({ ...status, workspace: {} }))),
        ).toBeNull();
      }),
  );
});
