import * as NodeCrypto from "node:crypto";
import {
  TwsContextError,
  TwsObservationId,
  type TwsContextSetInput,
  type TwsIntegrationState,
  TwsTopologyEntry,
  type TwsTopologyQuery,
  type TwsThreadContext,
  type ThreadId,
} from "@t3tools/contracts";
import * as Cause from "effect/Cause";
import * as DateTime from "effect/DateTime";
import * as Context from "effect/Context";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Queue from "effect/Queue";
import * as Schema from "effect/Schema";
import * as Scope from "effect/Scope";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";
import { ServerEnvironment } from "../environment/ServerEnvironment.ts";
import { OrchestrationEngineService } from "../orchestration/Services/OrchestrationEngine.ts";
import { TwsBindingRepository } from "../persistence/Services/TwsBindings.ts";
import { ServerSettingsService } from "../serverSettings.ts";
import { collectTwsTopology } from "./TwsTopologyRefresh.ts";
import { TwsContextStore } from "./TwsContextStore.ts";
import { TwsExecutionResolver } from "./TwsExecutionResolver.ts";
import { TwsCliAdapter } from "./TwsCliAdapter.ts";
import { initialTwsContext, inferTwsContext, invalidateTwsContext } from "./TwsContextInference.ts";
import { twsThreadLocationKey, twsTopologyEntry, type TwsExecution } from "./TwsContextModel.ts";

const isTwsContextError = Schema.is(TwsContextError);
const unavailable = (error: unknown) =>
  isTwsContextError(error)
    ? error
    : new TwsContextError({
        reason: "unavailable",
        message: "TWS context could not be read or updated.",
      });
const nowIso = DateTime.now.pipe(Effect.map(DateTime.formatIso));
const encodeEntry = Schema.encodeSync(Schema.fromJsonString(TwsTopologyEntry));
interface RefreshFlight {
  readonly receipt: Deferred.Deferred<TwsIntegrationState, TwsContextError>;
  fiber?: Fiber.Fiber<void, never>;
}

const make = Effect.gen(function* () {
  const settings = yield* ServerSettingsService;
  const environment = yield* ServerEnvironment;
  const environmentId = yield* environment.getEnvironmentId;
  const engine = yield* OrchestrationEngineService;
  const store = yield* TwsContextStore;
  const bindings = yield* TwsBindingRepository;
  const resolver = yield* TwsExecutionResolver;
  const cli = yield* TwsCliAdapter;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const owner = yield* Scope.Scope;
  const lock = yield* Semaphore.make(1);
  const requests = yield* Queue.sliding<void>(1);
  let enabled = false;
  let started = false;
  let flight: RefreshFlight | null = null;
  let epoch = 0;
  let readyEpoch = -1;
  const emptyState = (status: TwsIntegrationState["status"]): TwsIntegrationState => ({
    environmentId,
    status,
    generation: 0,
    observationId: null,
    observedAt: null,
    completeScopes: 0,
    incompleteScopes: 0,
  });
  const ensureEnabled = Effect.gen(function* () {
    if (!(yield* settings.getSettings).twsIntegrationEnabled)
      return yield* new TwsContextError({
        reason: "disabled",
        message: "TWS integration is disabled for this environment.",
      });
  }).pipe(Effect.mapError(unavailable));
  const state = Effect.gen(function* () {
    const current = yield* store.readState(environmentId);
    if (!(yield* settings.getSettings).twsIntegrationEnabled)
      return { ...(current ?? emptyState("disabled")), status: "disabled" as const };
    if (current?.status === "unavailable" && flight === null) return current;
    if (readyEpoch !== epoch)
      return {
        ...(current ?? emptyState("unknown")),
        status: flight ? ("refreshing" as const) : ("unknown" as const),
        observationId: null,
      };
    return current ?? emptyState("unknown");
  }).pipe(Effect.mapError(unavailable));

  const runRefresh = Effect.gen(function* () {
    yield* ensureEnabled;
    const refreshEpoch = epoch;
    const observationId = TwsObservationId.make(NodeCrypto.randomUUID());
    const observationTime = yield* nowIso;
    const observing = yield* store.begin({
      ...emptyState("refreshing"),
      observationId,
      observedAt: observationTime,
    });
    const projects = yield* store.projects();
    const inputs = yield* store.threads();
    const oldRecords = yield* store.records(environmentId);
    const collected = yield* collectTwsTopology({
      environmentId,
      observationId,
      observedAt: observationTime,
      previous: oldRecords,
      projects,
    }).pipe(
      Effect.provideService(TwsCliAdapter, cli),
      Effect.provideService(TwsBindingRepository, bindings),
      Effect.provideService(TwsExecutionResolver, resolver),
      Effect.provideService(FileSystem.FileSystem, fs),
      Effect.provideService(Path.Path, path),
    );
    const completed: TwsIntegrationState = {
      ...observing,
      status: collected.status,
      completeScopes: collected.completeScopes,
      incompleteScopes: collected.incompleteScopes,
    };
    const resolved = new Map<string, TwsExecution | null>();
    for (const thread of inputs) {
      if (thread.incarnation === null) continue;
      const cwd = thread.worktreePath ?? thread.workspaceRoot;
      if (!resolved.has(cwd))
        resolved.set(
          cwd,
          collected.status === "unavailable"
            ? null
            : Option.getOrNull(
                yield* resolver.resolve(cwd).pipe(
                  Effect.tapError(() =>
                    Effect.logWarning("TWS thread execution could not be verified.", {
                      threadId: thread.threadId,
                    }),
                  ),
                  Effect.option,
                ),
              ),
        );
    }
    yield* store.transaction(
      Effect.gen(function* () {
        yield* ensureEnabled;
        yield* store.guard(environmentId, observing.generation);
        const currentProjects = yield* store.projects();
        const currentThreads = yield* store.threads();
        if (
          refreshEpoch !== epoch ||
          projects.length !== currentProjects.length ||
          projects.some(
            (project, index) =>
              project.projectId !== currentProjects[index]?.projectId ||
              project.workspaceRoot !== currentProjects[index]?.workspaceRoot,
          ) ||
          inputs.length !== currentThreads.length ||
          inputs.some((thread, index) => {
            const current = currentThreads[index];
            return (
              !current ||
              thread.threadId !== current.threadId ||
              thread.incarnation !== current.incarnation ||
              twsThreadLocationKey(thread) !== twsThreadLocationKey(current)
            );
          })
        )
          return yield* new TwsContextError({
            reason: "conflict",
            message: "Execution context changed while TWS was refreshing.",
          });
        const projectIdsByWorkspace = new Map(
          collected.records.flatMap((record) =>
            record.kind === "workspace"
              ? [[record.workspaceBindingId, record.projectIds] as const]
              : [],
          ),
        );
        for (const record of collected.records) {
          switch (record.kind) {
            case "workspace":
              yield* bindings.upsertWorkspace({
                ...record.binding,
                retiredAt:
                  record.presence === "missing"
                    ? (record.binding.retiredAt ?? observationTime)
                    : record.binding.retiredAt,
              });
              if (record.presence === "present") {
                for (const projectId of record.projectIds)
                  yield* bindings.upsertWorkspaceProject({
                    environmentId,
                    workspaceBindingId: record.workspaceBindingId,
                    projectId,
                    firstSeenAt: observationTime,
                    lastSeenAt: observationTime,
                    retiredAt: null,
                  });
              }
              break;
            case "feature":
              yield* bindings.upsertFeature({
                ...record.binding,
                retiredAt:
                  record.presence === "missing"
                    ? (record.binding.retiredAt ?? observationTime)
                    : record.binding.retiredAt,
              });
              break;
            case "node":
              yield* bindings.upsertStackNode({
                ...record.binding,
                retiredAt:
                  record.presence === "missing"
                    ? (record.binding.retiredAt ?? observationTime)
                    : record.binding.retiredAt,
              });
              break;
          }
          yield* store.writeRecord(
            environmentId,
            record,
            twsTopologyEntry(record, projectIdsByWorkspace.get(record.workspaceBindingId) ?? []),
          );
        }
        const previous = yield* store.contexts(environmentId);
        const byThread = new Map(previous.map((context) => [context.context.threadId, context]));
        for (const thread of inputs) {
          if (!thread.incarnation) continue;
          yield* store.writeContext(
            environmentId,
            inferTwsContext({
              environmentId,
              thread,
              integration: completed,
              execution: resolved.get(thread.worktreePath ?? thread.workspaceRoot) ?? null,
              previous: byThread.get(thread.threadId),
              records: collected.records,
            }),
          );
        }
        yield* store.removeDeleted(environmentId);
        yield* store.finish(completed);
      }),
    );
    if (epoch === refreshEpoch) readyEpoch = refreshEpoch;
    return completed;
  }).pipe(
    Effect.tapError((error) => Effect.logWarning("TWS refresh failed.", { error })),
    Effect.mapError(unavailable),
  );

  const refresh = Effect.fn("TwsContextService.refresh")(function* () {
    const receipt = yield* lock.withPermit(
      Effect.gen(function* () {
        yield* ensureEnabled;
        enabled = true;
        if (flight !== null) return flight.receipt;
        const active: RefreshFlight = {
          receipt: yield* Deferred.make<TwsIntegrationState, TwsContextError>(),
        };
        flight = active;
        active.fiber = yield* runRefresh.pipe(
          Effect.onExit((exit) =>
            Effect.gen(function* () {
              if (Exit.isFailure(exit) && flight === active) {
                yield* store
                  .transaction(
                    Effect.gen(function* () {
                      const current = yield* store.readState(environmentId);
                      if (flight !== active || current?.status !== "refreshing") return;
                      yield* store.finish({
                        ...current,
                        status: "unavailable",
                        incompleteScopes: Math.max(1, current.incompleteScopes),
                      });
                    }),
                  )
                  .pipe(
                    Effect.catch((error) =>
                      Effect.logWarning("TWS failed observation could not be recorded.", { error }),
                    ),
                  );
              }
              if (flight === active) flight = null;
              if (Exit.isSuccess(exit)) yield* Deferred.succeed(active.receipt, exit.value);
              else {
                const error = enabled
                  ? unavailable(Cause.squash(exit.cause))
                  : new TwsContextError({
                      reason: "disabled",
                      message: "TWS refresh was cancelled because the integration was disabled.",
                    });
                yield* Deferred.fail(active.receipt, error);
              }
            }),
          ),
          Effect.catchCause((cause) =>
            Cause.hasInterruptsOnly(cause)
              ? Effect.void
              : Effect.logWarning("TWS refresh worker stopped.", { cause: Cause.pretty(cause) }),
          ),
          Effect.asVoid,
          Effect.interruptible,
          Effect.forkIn(owner),
        );
        return active.receipt;
      }),
    );
    return yield* Deferred.await(receipt);
  });

  const invalidate = Effect.fn("TwsContextService.invalidate")(function* (
    nextEnabled: boolean,
    force = true,
  ) {
    let active: RefreshFlight | null = null;
    let changed = false;
    yield* lock
      .withPermit(
        Effect.gen(function* () {
          if (!force && nextEnabled === enabled) return;
          changed = true;
          enabled = nextEnabled;
          epoch++;
          active = flight;
          flight = null;
          yield* store.begin(emptyState(nextEnabled ? "unknown" : "disabled"));
        }),
      )
      .pipe(
        Effect.ensuring(
          Effect.suspend(() => (active?.fiber ? Fiber.interrupt(active.fiber) : Effect.void)),
        ),
      );
    if (changed && nextEnabled) yield* Queue.offer(requests, undefined);
  }, Effect.mapError(unavailable));
  const configure = Effect.fn("TwsContextService.configure")(function* (nextEnabled: boolean) {
    yield* invalidate(nextEnabled, false);
  });
  const start = Effect.gen(function* () {
    if (started) return;
    started = true;
    const changes = yield* settings.subscribeChanges;
    const events = yield* engine.subscribeDomainEvents;
    yield* Stream.fromQueue(requests).pipe(
      Stream.runForEach(() =>
        refresh().pipe(
          Effect.catchTag("TwsContextError", (error) =>
            Effect.logWarning("TWS requested refresh did not complete.", { reason: error.reason }),
          ),
        ),
      ),
      Effect.forkIn(owner),
    );
    yield* changes.pipe(
      Stream.runForEach((value) =>
        configure(value.twsIntegrationEnabled).pipe(
          Effect.catchTag("TwsContextError", (error) =>
            Effect.logWarning("TWS integration setting could not be applied.", {
              reason: error.reason,
            }),
          ),
        ),
      ),
      Effect.forkIn(owner),
    );
    yield* events.pipe(
      Stream.runForEach((event) => {
        if (!enabled) return Effect.void;
        if (
          event.type === "thread.created" ||
          event.type === "thread.deleted" ||
          event.type === "project.created" ||
          event.type === "project.deleted" ||
          (event.type === "thread.meta-updated" &&
            (event.payload.branch !== undefined || event.payload.worktreePath !== undefined)) ||
          (event.type === "project.meta-updated" && event.payload.workspaceRoot !== undefined)
        )
          return invalidate(true).pipe(
            Effect.catchTag("TwsContextError", (error) =>
              Effect.logWarning("TWS context invalidation failed.", { reason: error.reason }),
            ),
          );
        return Effect.void;
      }),
      Effect.forkIn(owner),
    );
    yield* configure((yield* settings.getSettings).twsIntegrationEnabled);
  }).pipe(Effect.mapError(unavailable));

  const getContexts = Effect.fn("TwsContextService.getContexts")(function* (
    threadIds: ReadonlyArray<ThreadId>,
  ) {
    const integration = yield* state;
    if (integration.status === "disabled")
      return { integration, contexts: [], unavailableThreadIds: [] };
    return yield* store.transaction(
      Effect.gen(function* () {
        const inputs = yield* store.threads(threadIds);
        const existing = yield* store.contexts(environmentId, threadIds);
        const contexts: TwsThreadContext[] = [];
        for (const thread of inputs) {
          if (!thread.incarnation) continue;
          const stored = existing.find(
            (row) =>
              row.context.threadId === thread.threadId && row.incarnation === thread.incarnation,
          );
          if (!stored) {
            contexts.push(initialTwsContext(environmentId, thread));
            continue;
          }
          const current = invalidateTwsContext(stored, thread);
          if (current !== stored) yield* store.writeContext(environmentId, current);
          contexts.push(
            current.choice.mode !== "none" &&
              (current.context.observationId !== integration.observationId ||
                (integration.status !== "ready" && integration.status !== "degraded"))
              ? {
                  ...current.context,
                  freshness:
                    current.context.lastConfirmedAt === null
                      ? ("unknown" as const)
                      : ("stale" as const),
                  reason:
                    current.context.freshness === "confirmed"
                      ? ("source-unavailable" as const)
                      : current.context.reason,
                }
              : current.context,
          );
        }
        return {
          integration,
          contexts,
          unavailableThreadIds: threadIds.filter(
            (id) => !contexts.some((context) => context.threadId === id),
          ),
        };
      }),
    );
  }, Effect.mapError(unavailable));

  const setContext = Effect.fn("TwsContextService.setContext")(
    function* (input: TwsContextSetInput) {
      yield* ensureEnabled;
      const thread = (yield* store.threads([input.threadId]))[0];
      if (!thread?.incarnation)
        return yield* new TwsContextError({
          reason: "thread-unavailable",
          message: "The owning thread is no longer available.",
        });
      if (input.choice.mode !== "none") yield* refresh();
      const integration = yield* state;
      const records = yield* store.records(environmentId);
      if (input.choice.mode === "explicit") {
        const choice = input.choice;
        const workspace = records.find(
          (record) =>
            record.kind === "workspace" &&
            record.workspaceBindingId === choice.workspaceBindingId &&
            record.presence === "present" &&
            record.observationId === integration.observationId &&
            record.projectIds.includes(thread.projectId),
        );
        const feature =
          choice.featureBindingId === null
            ? null
            : records.find(
                (record) =>
                  record.kind === "feature" &&
                  record.binding.featureBindingId === choice.featureBindingId &&
                  record.workspaceBindingId === choice.workspaceBindingId &&
                  record.complete &&
                  record.presence === "present" &&
                  record.observationId === integration.observationId,
              );
        if (
          (integration.status !== "ready" && integration.status !== "degraded") ||
          integration.observationId === null ||
          !workspace ||
          (choice.featureBindingId !== null && !feature)
        )
          return yield* new TwsContextError({
            reason: "invalid-selection",
            message: "Choose a currently verified workspace and feature belonging to this project.",
          });
      }
      const execution =
        input.choice.mode === "none"
          ? null
          : Option.getOrNull(
              yield* resolver.resolve(thread.worktreePath ?? thread.workspaceRoot).pipe(
                Effect.tapError(() =>
                  Effect.logWarning("TWS context choice has no verified execution node.", {
                    threadId: thread.threadId,
                  }),
                ),
                Effect.option,
              ),
            );
      return yield* store.transaction(
        Effect.gen(function* () {
          yield* ensureEnabled;
          yield* store.guard(environmentId, integration.generation);
          const currentThread = (yield* store.threads([input.threadId]))[0];
          if (
            !currentThread ||
            currentThread.incarnation !== thread.incarnation ||
            twsThreadLocationKey(currentThread) !== twsThreadLocationKey(thread)
          )
            return yield* new TwsContextError({
              reason: "conflict",
              message: "The thread execution location changed; reload its context.",
            });
          const previous = (yield* store.contexts(environmentId, [thread.threadId])).find(
            (row) => row.incarnation === thread.incarnation,
          );
          const current = previous ? invalidateTwsContext(previous, thread) : undefined;
          if ((current?.context.revision ?? 0) !== input.expectedRevision)
            return yield* new TwsContextError({
              reason: "conflict",
              message: "TWS context changed; reload it before applying this choice.",
            });
          const next = inferTwsContext({
            environmentId,
            thread,
            records,
            execution,
            integration,
            previous: current,
            choice: input.choice,
          });
          yield* store.writeContext(environmentId, next);
          return next.context;
        }),
      );
    },
    Effect.tapError((error) => Effect.logWarning("TWS context choice rejected.", { error })),
    Effect.mapError(unavailable),
  );

  const query = Effect.fn("TwsContextService.query")(function* (input: TwsTopologyQuery) {
    const integration = yield* state;
    if (integration.status === "disabled") return { integration, entries: [], nextCursor: null };
    if (
      input.workspaceBindingId &&
      (yield* store.record(environmentId, input.workspaceBindingId))?.kind !== "workspace"
    )
      return yield* new TwsContextError({
        reason: "invalid-selection",
        message: "That TWS workspace is not known in this environment.",
      });
    if (input.featureBindingId) {
      const feature = yield* store.record(environmentId, input.featureBindingId);
      if (
        feature?.kind !== "feature" ||
        (input.workspaceBindingId && feature.workspaceBindingId !== input.workspaceBindingId)
      )
        return yield* new TwsContextError({
          reason: "invalid-selection",
          message: "That TWS feature does not belong to the selected workspace.",
        });
    }
    const entries = (yield* store.page(environmentId, input)).map((entry) =>
      entry.observationId === integration.observationId &&
      (integration.status === "ready" || integration.status === "degraded")
        ? entry
        : { ...entry, complete: false, presence: "unknown" as const },
    );
    const page: TwsTopologyEntry[] = [];
    let bytes = 0;
    for (const entry of entries) {
      const size = new TextEncoder().encode(encodeEntry(entry)).byteLength;
      if (size > 60 * 1024)
        return yield* new TwsContextError({
          reason: "unavailable",
          message: "A TWS topology row exceeds the bounded response size.",
        });
      if (page.length >= (input.limit ?? 50) || bytes + size > 60 * 1024) break;
      page.push(entry);
      bytes += size;
    }
    return {
      integration,
      entries: page,
      nextCursor: entries.length > page.length ? (page.at(-1)?.bindingId ?? null) : null,
    };
  }, Effect.mapError(unavailable));
  const provenance = Effect.fn("TwsContextService.provenance")(function* (bindingId: string) {
    yield* ensureEnabled;
    const record = yield* store.record(environmentId, bindingId);
    if (!record)
      return yield* new TwsContextError({
        reason: "invalid-selection",
        message: "That TWS binding is not known in this environment.",
      });
    return {
      bindingId,
      canonicalLocator: record.binding.canonicalLocator,
      locators: record.binding.locators,
    };
  }, Effect.mapError(unavailable));
  return { start, refresh, configure, state, getContexts, setContext, query, provenance };
});

export class TwsContextService extends Context.Service<
  TwsContextService,
  Effect.Success<typeof make>
>()("t3/tws/TwsContextService") {}
export const TwsContextServiceLive = Layer.effect(TwsContextService, make);
