import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import {
  EnvironmentId,
  ThreadId,
  TwsContextError,
  type OrchestrationEvent,
} from "@t3tools/contracts";
import * as Deferred from "effect/Deferred";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as PubSub from "effect/PubSub";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import { ServerEnvironment } from "../environment/ServerEnvironment.ts";
import { OrchestrationEngineService } from "../orchestration/Services/OrchestrationEngine.ts";
import { TwsBindingRepositoryLive } from "../persistence/Layers/TwsBindings.ts";
import {
  SqlitePersistenceMemory,
  makeSqlitePersistenceLive,
} from "../persistence/Layers/Sqlite.ts";
import { ServerSettingsService, layerTest as settingsLayer } from "../serverSettings.ts";
import { TwsCliAdapter } from "./TwsCliAdapter.ts";
import { decodeTwsStackStatus, decodeTwsStatus, TwsOutputDecodeError } from "./TwsCliDecoder.ts";
import { TwsContextService, TwsContextServiceLive } from "./TwsContextService.ts";
import { TwsContextStore, TwsContextStoreLive } from "./TwsContextStore.ts";
import { TwsExecutionResolver } from "./TwsExecutionResolver.ts";

const encodeJson = Schema.encodeSync(Schema.fromJsonString(Schema.Unknown));
const env = EnvironmentId.make("environment-a");
const threadId = ThreadId.make("thread-a");
const date = "2026-09-30T00:00:00Z";

const harness = Effect.fn(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const sql = yield* SqlClient.SqlClient;
  const root = yield* fs.makeTempDirectoryScoped();
  const otherRoot = yield* fs.makeTempDirectoryScoped();
  const repo = path.join(root, "repo");
  const checkout = path.join(root, "feature-a");
  const common = path.join(root, "repo.git");
  const calls: string[] = [];
  const controls = {
    marker: "a".repeat(32),
    registryPath: root,
    feature: "feature-a",
    branch: "feature-a",
    node: "node",
    extraFeature: false,
    stackFails: false,
    registryFails: false,
    executionMissing: false,
    archived: false,
    partial: false,
    extraWorkspace: false,
    manyFeatures: 0,
    gate: null as Deferred.Deferred<void> | null,
    entered: null as Deferred.Deferred<void> | null,
    cancelled: null as Deferred.Deferred<void> | null,
  };
  const adapter = TwsCliAdapter.of({
    probe: () =>
      Effect.gen(function* () {
        calls.push("version");
        if (controls.entered) yield* Deferred.succeed(controls.entered, undefined);
        if (controls.gate) yield* Deferred.await(controls.gate);
        return { version: "v1.2.14" as const };
      }).pipe(
        Effect.onInterrupt(() =>
          controls.cancelled ? Deferred.succeed(controls.cancelled, undefined) : Effect.void,
        ),
      ),
    listRegistry: () => Effect.die("Unexpected separate registry scan"),
    checkRegistry: () =>
      Effect.gen(function* () {
        calls.push("registry");
        if (controls.registryFails)
          return yield* new TwsOutputDecodeError({
            command: "registry-check",
            reason: "invalid-json",
            detail: "fixture",
          });
        const entries = [
          {
            entry: {
              id: "registry-a",
              path: controls.registryPath,
              aliases: ["Workspace"],
              kind: "external-workspace",
              gitIdentity: "repo",
              markerId: controls.marker,
              addedAt: date,
              updatedAt: date,
              raw: {},
            },
            status: "ok",
            raw: {},
          },
        ];
        if (controls.extraWorkspace)
          entries.push({
            entry: {
              ...entries[0]!.entry,
              id: "registry-b",
              path: otherRoot,
              markerId: "b".repeat(32),
            },
            status: "ok",
            raw: {},
          });
        return entries;
      }),
    readStatus: ({ cwd }) => {
      calls.push("status");
      const feature = (name: string) => ({
        feature: name,
        path: path.join(cwd, "features", name),
        stack_state: "ok",
        entries: [{ name: controls.node, git_branch: controls.branch }],
      });
      const features = [
        feature(controls.feature),
        ...(controls.extraFeature ? [feature("other-feature")] : []),
        ...Array.from({ length: controls.manyFeatures }, (_, index) => feature(`feature-${index}`)),
      ];
      return decodeTwsStatus(
        encodeJson({
          schema_version: 1,
          generated_at: date,
          workspace: {
            mode: "external",
            stable_id: "path-derived-not-identity",
            repo_root: repo,
            metadata_root: cwd,
            degraded: false,
          },
          features,
          issues: [],
          summary: { features: controls.partial ? 99 : features.length, entries: features.length },
        }),
      );
    },
    readStackStatus: ({ cwd, feature }) => {
      calls.push(`stack:${feature}`);
      if (controls.stackFails && feature === "other-feature")
        return Effect.fail(
          new TwsOutputDecodeError({
            command: "stack-status",
            reason: "invalid-json",
            detail: "fixture",
          }),
        );
      return decodeTwsStackStatus(
        encodeJson({
          schema_version: 1,
          feature,
          workspace: {
            mode: "external",
            metadata_root: cwd,
            repository: { dir: repo },
            checkout: null,
          },
          entries: [
            {
              name: controls.node,
              git_branch: controls.branch,
              archived: controls.archived,
              repo: null,
              ref_exists: true,
              is_current_checkout: false,
              materialization: {
                kind: "worktree",
                state: controls.archived ? "archived" : "present",
                path: controls.archived ? null : checkout,
                checked_out_branch: controls.branch,
                detached: false,
              },
            },
          ],
          summary: { entries: 1 },
        }),
      );
    },
  });
  const resolver = TwsExecutionResolver.of({
    resolve: (cwd) =>
      controls.executionMissing
        ? Effect.fail(
            new TwsContextError({ reason: "unavailable", message: "Missing fixture execution" }),
          )
        : Effect.succeed({
            path: cwd,
            root: cwd,
            commonDirectory: common,
            branch: cwd === repo ? "main" : controls.branch,
          }),
  });
  const events = yield* PubSub.unbounded<OrchestrationEvent>();
  const engine = OrchestrationEngineService.of({
    dispatch: () => Effect.die("TWS must not dispatch provider or thread operations"),
    readEvents: () => Stream.die("unused"),
    readThreadEvents: () => Stream.die("unused"),
    getThreadReplayStats: () => Effect.die("unused"),
    latestSequence: Effect.succeed(0),
    streamDomainEvents: Stream.fromPubSub(events),
    subscribeDomainEvents: PubSub.subscribe(events).pipe(Effect.map(Stream.fromSubscription)),
  });
  yield* sql`INSERT INTO projection_projects(project_id,title,workspace_root,scripts_json,created_at,updated_at)
    VALUES ('project-a','Project',${repo},'[]',${date},${date})`;
  yield* sql`INSERT INTO projection_threads(thread_id,project_id,title,branch,worktree_path,created_at,updated_at)
    VALUES (${threadId},'project-a','Thread',${controls.branch},${checkout},${date},${date})`;
  yield* sql`INSERT INTO orchestration_events(event_id,aggregate_kind,stream_id,stream_version,event_type,occurred_at,actor_kind,payload_json,metadata_json)
    VALUES ('thread-created','thread',${threadId},1,'thread.created',${date},'user','{}','{}')`;
  yield* sql`INSERT INTO orchestration_events(event_id,aggregate_kind,stream_id,stream_version,event_type,occurred_at,actor_kind,payload_json,metadata_json)
    VALUES ('project-created','project','project-a',1,'project.created',${date},'user','{}','{}')`;
  const serviceLayer = TwsContextServiceLive.pipe(
    Layer.provideMerge(settingsLayer()),
    Layer.provide(TwsContextStoreLive),
    Layer.provide(TwsBindingRepositoryLive),
    Layer.provide(Layer.succeed(TwsCliAdapter, adapter)),
    Layer.provide(Layer.succeed(TwsExecutionResolver, resolver)),
    Layer.provide(
      Layer.succeed(ServerEnvironment, {
        getEnvironmentId: Effect.succeed(env),
        getDescriptor: Effect.die("unused"),
      }),
    ),
    Layer.provide(Layer.succeed(OrchestrationEngineService, engine)),
  );
  const context = yield* Layer.build(serviceLayer);
  const service = Context.get(context, TwsContextService);
  const settings = Context.get(context, ServerSettingsService);
  yield* service.start;
  const enable = Effect.gen(function* () {
    yield* settings.updateSettings({ twsIntegrationEnabled: true });
    yield* service.configure(true);
  });
  return {
    service,
    settings,
    enable,
    calls,
    controls,
    root,
    otherRoot,
    repo,
    checkout,
    sql,
    events,
  };
});

const base = Layer.mergeAll(SqlitePersistenceMemory, NodeServices.layer);
describe("optional TWS context", () => {
  it.effect("keeps an explicit clear across a real database close and reopen", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const directory = yield* fs.makeTempDirectoryScoped();
      const persistence = makeSqlitePersistenceLive(path.join(directory, "context.sqlite"));
      const saved = yield* Effect.scoped(
        Effect.gen(function* () {
          const h = yield* harness();
          yield* h.enable;
          yield* h.service.refresh();
          const context = (yield* h.service.getContexts([threadId])).contexts[0]!;
          return yield* h.service.setContext({
            threadId,
            expectedRevision: context.revision,
            choice: { mode: "none" },
          });
        }).pipe(Effect.provide(Layer.fresh(persistence))),
      );
      const reopened = yield* Effect.scoped(
        Effect.gen(function* () {
          const store = yield* TwsContextStore;
          return yield* store.contexts(env, [threadId]);
        }).pipe(Effect.provide(TwsContextStoreLive.pipe(Layer.provide(Layer.fresh(persistence))))),
      );
      expect(reopened[0]?.context).toEqual(saved);
      expect(reopened[0]?.choice).toEqual({ mode: "none" });
    }).pipe(Effect.provide(NodeServices.layer)),
  );
  it.effect(
    "keeps workspace ambiguity separate from an explicit parent-scoped feature choice",
    () =>
      Effect.gen(function* () {
        const h = yield* harness();
        h.controls.extraWorkspace = true;
        yield* h.enable;
        yield* h.service.refresh();
        const current = (yield* h.service.getContexts([threadId])).contexts[0]!;
        expect(current.reason).toBe("ambiguous");
        const topology = (yield* h.service.query({})).entries;
        const feature = topology.find((entry) => entry.kind === "feature")!;
        const selected = yield* h.service.setContext({
          threadId,
          expectedRevision: current.revision,
          choice: {
            mode: "explicit",
            workspaceBindingId: feature.workspaceBindingId,
            featureBindingId: feature.featureBindingId,
          },
        });
        expect(selected.featureBindingId).toBe(feature.featureBindingId);
        expect(selected.stackNodeBindingId).not.toBeNull();
      }).pipe(Effect.provide(base)),
  );

  it.effect(
    "preserves proven workspace moves but requires reassignment for feature renames and marker conflicts",
    () =>
      Effect.gen(function* () {
        const h = yield* harness();
        yield* h.enable;
        yield* h.service.refresh();
        const initial = (yield* h.service.getContexts([threadId])).contexts[0]!;
        h.controls.registryPath = h.otherRoot;
        yield* h.service.refresh();
        const moved = (yield* h.service.getContexts([threadId])).contexts[0]!;
        expect(moved.workspaceBindingId).toBe(initial.workspaceBindingId);
        expect(moved.featureBindingId).toBe(initial.featureBindingId);
        h.controls.node = "renamed-node";
        yield* h.service.refresh();
        yield* h.service.refresh();
        const renamedNode = (yield* h.service.getContexts([threadId])).contexts[0]!;
        expect(renamedNode.reason).toBe("source-identity-changed");
        expect(renamedNode.stackNodeBindingId).toBe(initial.stackNodeBindingId);
        h.controls.feature = "renamed-feature";
        yield* h.service.refresh();
        const renamed = (yield* h.service.getContexts([threadId])).contexts[0]!;
        expect(renamed.featureBindingId).toBe(initial.featureBindingId);
        expect(renamed.reason).toBe("source-identity-changed");
        expect(renamed.freshness).toBe("stale");
        h.controls.marker = "c".repeat(32);
        yield* h.service.refresh();
        const topology = (yield* h.service.query({})).entries;
        const replacement = topology.find(
          (entry) => entry.kind === "workspace" && entry.presence === "present",
        )!;
        expect(replacement.bindingId).not.toBe(initial.workspaceBindingId);
        expect(replacement.requiresConfirmation).toBe(true);
        expect((yield* h.service.getContexts([threadId])).contexts[0]?.workspaceBindingId).toBe(
          initial.workspaceBindingId,
        );
      }).pipe(Effect.provide(base)),
  );

  it.effect(
    "returns bounded path-free pages and retains last-known data after failed or truncated scans",
    () =>
      Effect.gen(function* () {
        const h = yield* harness();
        h.controls.manyFeatures = 110;
        yield* h.enable;
        yield* h.service.refresh();
        const first = yield* h.service.query({ limit: 100 });
        expect(first.entries.length).toBeLessThanOrEqual(100);
        expect(new TextEncoder().encode(encodeJson(first)).byteLength).toBeLessThanOrEqual(
          64 * 1024,
        );
        expect(first.nextCursor).not.toBeNull();
        expect(encodeJson(first)).not.toContain(h.root);
        const next = yield* h.service.query({ after: first.nextCursor!, limit: 100 });
        expect(
          next.entries.every(
            (entry) => !first.entries.some((old) => old.bindingId === entry.bindingId),
          ),
        ).toBe(true);
        const detail = yield* h.service.provenance(first.entries[0]!.bindingId);
        expect(detail.locators.length).toBeGreaterThan(0);
        h.controls.registryFails = true;
        expect((yield* h.service.refresh()).status).toBe("unavailable");
        expect((yield* h.service.query({ limit: 100 })).entries.length).toBeGreaterThan(0);
        expect((yield* h.service.getContexts([threadId])).contexts[0]?.freshness).not.toBe(
          "confirmed",
        );
      }).pipe(Effect.provide(base)),
  );

  it.effect(
    "does not let an older refresh overwrite an explicit clear or changed execution location",
    () =>
      Effect.gen(function* () {
        const h = yield* harness();
        yield* h.enable;
        yield* h.service.refresh();
        const initial = (yield* h.service.getContexts([threadId])).contexts[0]!;
        h.controls.gate = yield* Deferred.make<void>();
        h.controls.entered = yield* Deferred.make<void>();
        const running = yield* h.service
          .refresh()
          .pipe(Effect.forkScoped({ startImmediately: true }));
        yield* Deferred.await(h.controls.entered);
        yield* h.service.setContext({
          threadId,
          expectedRevision: initial.revision,
          choice: { mode: "none" },
        });
        yield* Deferred.succeed(h.controls.gate, undefined);
        yield* Fiber.join(running);
        expect((yield* h.service.getContexts([threadId])).contexts[0]?.mode).toBe("none");
        h.controls.gate = yield* Deferred.make<void>();
        h.controls.entered = yield* Deferred.make<void>();
        const stale = yield* h.service
          .refresh()
          .pipe(Effect.forkScoped({ startImmediately: true }));
        yield* Deferred.await(h.controls.entered);
        yield* h.sql`UPDATE projection_threads SET branch = 'changed' WHERE thread_id = ${threadId}`;
        yield* Deferred.succeed(h.controls.gate, undefined);
        expect((yield* Fiber.join(stale).pipe(Effect.flip)).reason).toBe("conflict");
        expect((yield* h.service.state).status).toBe("unavailable");
      }).pipe(Effect.provide(base)),
  );
  it.effect("makes no CLI calls while disabled, including refresh and context requests", () =>
    Effect.gen(function* () {
      const h = yield* harness();
      expect((yield* h.service.query({})).integration.status).toBe("disabled");
      expect((yield* h.service.getContexts([threadId])).contexts).toEqual([]);
      expect((yield* h.service.refresh().pipe(Effect.flip)).reason).toBe("disabled");
      expect(h.calls).toEqual([]);
    }).pipe(Effect.provide(base)),
  );

  it.effect(
    "coalesces simultaneous refreshes, persists exact context and leaves revisions stable on observations",
    () =>
      Effect.gen(function* () {
        const h = yield* harness();
        h.controls.gate = yield* Deferred.make<void>();
        h.controls.entered = yield* Deferred.make<void>();
        yield* h.enable;
        yield* Deferred.await(h.controls.entered);
        const first = yield* h.service
          .refresh()
          .pipe(Effect.forkScoped({ startImmediately: true }));
        const second = yield* h.service
          .refresh()
          .pipe(Effect.forkScoped({ startImmediately: true }));
        yield* Deferred.succeed(h.controls.gate, undefined);
        const a = yield* Fiber.join(first);
        const b = yield* Fiber.join(second);
        expect(a.observationId).toBe(b.observationId);
        expect(h.calls.filter((call) => call === "version")).toHaveLength(1);
        const before = (yield* h.service.getContexts([threadId])).contexts[0]!;
        expect(before.freshness).toBe("confirmed");
        expect(before.stackNodeBindingId).not.toBeNull();
        yield* h.service.refresh();
        const after = (yield* h.service.getContexts([threadId])).contexts[0]!;
        expect(after.revision).toBe(before.revision);
        expect(after.observationId).not.toBe(before.observationId);
        expect(after.featureBindingId).toBe(before.featureBindingId);
      }).pipe(Effect.provide(base)),
  );

  it.effect(
    "supports explicit set/clear/auto with conflicts and rejects unrelated membership",
    () =>
      Effect.gen(function* () {
        const h = yield* harness();
        yield* h.enable;
        yield* h.service.refresh();
        const initial = (yield* h.service.getContexts([threadId])).contexts[0]!;
        const chosen = yield* h.service.setContext({
          threadId,
          expectedRevision: initial.revision,
          choice: {
            mode: "explicit",
            workspaceBindingId: initial.workspaceBindingId!,
            featureBindingId: initial.featureBindingId,
          },
        });
        expect(chosen.mode).toBe("explicit");
        const cleared = yield* h.service.setContext({
          threadId,
          expectedRevision: chosen.revision,
          choice: { mode: "none" },
        });
        yield* h.service.refresh();
        expect((yield* h.service.getContexts([threadId])).contexts[0]?.mode).toBe("none");
        expect(
          (yield* h.service
            .setContext({ threadId, expectedRevision: chosen.revision, choice: { mode: "auto" } })
            .pipe(Effect.flip)).reason,
        ).toBe("conflict");
        const automatic = yield* h.service.setContext({
          threadId,
          expectedRevision: cleared.revision,
          choice: { mode: "auto" },
        });
        expect(automatic.stackNodeBindingId).not.toBeNull();
        yield* h.sql`UPDATE projection_threads SET project_id = 'missing-project' WHERE thread_id = ${threadId}`;
        expect(
          (yield* h.service
            .setContext({
              threadId,
              expectedRevision: automatic.revision,
              choice: { mode: "none" },
            })
            .pipe(Effect.flip)).reason,
        ).toBe("thread-unavailable");
      }).pipe(Effect.provide(base)),
  );

  it.effect(
    "keeps logical choice on checkout change and prevents an old incarnation from reusing it",
    () =>
      Effect.gen(function* () {
        const h = yield* harness();
        yield* h.enable;
        yield* h.service.refresh();
        const initial = (yield* h.service.getContexts([threadId])).contexts[0]!;
        const explicit = yield* h.service.setContext({
          threadId,
          expectedRevision: initial.revision,
          choice: {
            mode: "explicit",
            workspaceBindingId: initial.workspaceBindingId!,
            featureBindingId: initial.featureBindingId,
          },
        });
        yield* h.sql`UPDATE projection_threads SET branch = 'elsewhere', worktree_path = ${h.repo} WHERE thread_id = ${threadId}`;
        const stale = (yield* h.service.getContexts([threadId])).contexts[0]!;
        expect(stale.featureBindingId).toBe(explicit.featureBindingId);
        expect(stale.stackNodeBindingId).toBeNull();
        expect(stale.revision).toBeGreaterThan(explicit.revision);
        yield* h.sql`INSERT INTO orchestration_events(event_id,aggregate_kind,stream_id,stream_version,event_type,occurred_at,actor_kind,payload_json,metadata_json)
      VALUES ('recreated','thread',${threadId},2,'thread.created',${date},'user','{}','{}')`;
        const recreated = (yield* h.service.getContexts([threadId])).contexts[0]!;
        expect(recreated.revision).toBe(0);
        expect(recreated.featureBindingId).toBeNull();
        yield* h.sql`INSERT INTO orchestration_events(event_id,aggregate_kind,stream_id,stream_version,event_type,occurred_at,actor_kind,payload_json,metadata_json)
          VALUES ('project-recreated','project','project-a',2,'project.created',${date},'user','{}','{}')`;
        expect((yield* h.service.getContexts([threadId])).contexts[0]?.mode).toBe("auto");
      }).pipe(Effect.provide(base)),
  );

  it.effect(
    "preserves partial positives, rejects ambiguity and never fabricates a node for archived work",
    () =>
      Effect.gen(function* () {
        const h = yield* harness();
        yield* h.enable;
        yield* h.service.refresh();
        const first = (yield* h.service.getContexts([threadId])).contexts[0]!;
        h.controls.extraFeature = true;
        yield* h.service.refresh();
        expect((yield* h.service.getContexts([threadId])).contexts[0]?.reason).toBe("ambiguous");
        h.controls.stackFails = true;
        const partial = yield* h.service.refresh();
        expect(partial.status).toBe("degraded");
        const rows = (yield* h.service.query({})).entries;
        expect(
          rows.some((row) => row.kind === "feature" && row.label === "feature-a" && row.complete),
        ).toBe(true);
        expect(rows.some((row) => row.label === "other-feature" && !row.complete)).toBe(true);
        const current = (yield* h.service.getContexts([threadId])).contexts[0]!;
        const selected = yield* h.service.setContext({
          threadId,
          expectedRevision: current.revision,
          choice: {
            mode: "explicit",
            workspaceBindingId: first.workspaceBindingId!,
            featureBindingId: first.featureBindingId,
          },
        });
        expect(selected.featureBindingId).toBe(first.featureBindingId);
        h.controls.archived = true;
        yield* h.service.refresh();
        expect(
          (yield* h.service.getContexts([threadId])).contexts[0]?.stackNodeBindingId,
        ).toBeNull();
      }).pipe(Effect.provide(base)),
  );

  it.effect("cancels an owned scan on disable and requires fresh observation after re-enable", () =>
    Effect.gen(function* () {
      const h = yield* harness();
      yield* h.enable;
      yield* h.service.refresh();
      h.controls.gate = yield* Deferred.make<void>();
      h.controls.entered = yield* Deferred.make<void>();
      h.controls.cancelled = yield* Deferred.make<void>();
      const running = yield* h.service
        .refresh()
        .pipe(Effect.forkScoped({ startImmediately: true }));
      yield* Deferred.await(h.controls.entered);
      yield* h.settings.updateSettings({ twsIntegrationEnabled: false });
      yield* h.service.configure(false);
      yield* Deferred.await(h.controls.cancelled);
      expect((yield* Fiber.join(running).pipe(Effect.flip)).reason).toBe("disabled");
      expect((yield* h.service.query({})).entries).toEqual([]);
      h.controls.gate = null;
      yield* h.enable;
      yield* h.service.refresh();
      expect((yield* h.service.getContexts([threadId])).contexts[0]?.freshness).toBe("confirmed");
    }).pipe(Effect.provide(base)),
  );
});
