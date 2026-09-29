import { WS_METHODS, type EnvironmentId } from "@t3tools/contracts";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import {
  attentionSyncFailed,
  emptyAttentionSync,
  reduceAttentionStream,
} from "../attentionSync.ts";
import type { ConnectionCatalogEntry } from "../connection/catalog.ts";
import type { SupervisorConnectionState } from "../connection/model.ts";
import { EnvironmentRegistry } from "../connection/registry.ts";
import { EnvironmentSupervisor, retryDelayMs } from "../connection/supervisor.ts";
import { EnvironmentRpcSubscriptionObserver, isRpcClientError } from "../rpc/client.ts";
import type { RpcSession } from "../rpc/session.ts";
import {
  aggregateAttention,
  emptyEnvironmentAttention,
  type AttentionWorkspaceState,
  type EnvironmentAttentionState,
} from "./attentionProjection.ts";

function authorizationLost(state: SupervisorConnectionState) {
  return (
    state.phase === "blocked" &&
    (state.lastFailure?.reason === "authentication" || state.lastFailure?.reason === "permission")
  );
}

/** Owns only a subscription; connection lifecycle belongs to the existing supervisor. */
export const makeEnvironmentAttentionState = Effect.fn("makeEnvironmentAttentionState")(
  function* () {
    const supervisor = yield* EnvironmentSupervisor;
    const observer = yield* EnvironmentRpcSubscriptionObserver;
    const environmentId = supervisor.target.environmentId;
    const state = yield* SubscriptionRef.make(emptyEnvironmentAttention());
    let sync = emptyAttentionSync();

    const clear = Effect.fn(function* (
      status: "unauthorized" | "unsupported" | "error",
      reason: string,
    ) {
      sync = emptyAttentionSync();
      yield* SubscriptionRef.set(state, { ...emptyEnvironmentAttention(), status, reason });
    });
    const markStale = (reason: string) =>
      SubscriptionRef.update(state, (current): EnvironmentAttentionState => ({
        ...current,
        status:
          current.status === "unauthorized"
            ? "unauthorized"
            : current.hasSnapshot
              ? "stale"
              : "loading",
        reason: current.status === "unauthorized" ? "unauthorized" : reason,
      }));
    const ownsSession = Effect.fn(function* (session: RpcSession) {
      const active = yield* SubscriptionRef.get(supervisor.session);
      return (
        Option.isSome(active) &&
        active.value === session &&
        !authorizationLost(yield* SubscriptionRef.get(supervisor.state))
      );
    });

    const consume = Effect.fn("attention.consumeSession")(function* (session: RpcSession) {
      // The delivery token binds server-side authentication, not just environment ID.
      // A replacement RPC session must establish a fresh fence before reusing authority.
      sync = emptyAttentionSync();
      yield* SubscriptionRef.update(state, (current): EnvironmentAttentionState => ({
        ...current,
        status: current.hasSnapshot ? "syncing" : "loading",
        reason: null,
      }));
      const config = yield* Effect.exit(session.initialConfig);
      if (!(yield* ownsSession(session))) return;
      if (Exit.isFailure(config)) {
        if (Cause.hasInterrupts(config.cause)) return yield* Effect.interrupt;
        if (
          config.cause.reasons.some(
            (reason) =>
              reason._tag === "Fail" &&
              reason.error._tag === "ConnectionBlockedError" &&
              (reason.error.reason === "authentication" || reason.error.reason === "permission"),
          )
        ) {
          yield* clear("unauthorized", "unauthorized");
        } else {
          yield* markStale("configuration-unavailable");
        }
        yield* Effect.logWarning("Attention configuration unavailable.", { environmentId });
        return;
      }
      if (config.value.environment.environmentId !== environmentId) {
        yield* clear("error", "environment-mismatch");
        yield* Effect.logWarning("Attention configuration environment mismatch.", {
          environmentId,
        });
        return;
      }
      if (config.value.environment.capabilities.attentionSync !== true) {
        yield* clear("unsupported", "attention-sync-unsupported");
        return;
      }

      let failures = 0;
      while (yield* ownsSession(session)) {
        let retry = false;
        let terminal = false;
        const input =
          sync.cursor !== null && sync.status === "stale" ? { cursor: sync.cursor } : {};
        const completeObservation = yield* observer.observe({
          environmentId,
          method: WS_METHODS.attentionSubscribe,
          input,
        });
        const result = yield* session.client[WS_METHODS.attentionSubscribe](input).pipe(
          Stream.tap((message) =>
            Effect.gen(function* () {
              if (retry || terminal) return;
              if (!(yield* ownsSession(session))) {
                terminal = true;
                return;
              }
              if (message.type !== "reset-required" && message.environmentId !== environmentId) {
                yield* clear("error", "environment-mismatch");
                yield* Effect.logWarning("Attention stream environment mismatch.", {
                  environmentId,
                });
                terminal = true;
                return;
              }
              sync = reduceAttentionStream(sync, message);
              if (sync.status === "reset-required") {
                retry = message.type === "reset-required" && message.reason !== "message-too-large";
                terminal = !retry;
                yield* SubscriptionRef.update(state, (current): EnvironmentAttentionState => ({
                  ...current,
                  status: retry ? (current.hasSnapshot ? "stale" : "loading") : "error",
                  reason: sync.reason,
                }));
                yield* Effect.logWarning("Attention stream requires resynchronization.", {
                  environmentId,
                  reason: sync.reason,
                  retry,
                });
              } else if (sync.status === "live") {
                yield* SubscriptionRef.set(state, {
                  status: "live",
                  hasSnapshot: true,
                  entries: sync.entries,
                  reason: null,
                });
              } else if (message.type === "begin") {
                yield* SubscriptionRef.update(state, (current): EnvironmentAttentionState => ({
                  ...current,
                  status: current.hasSnapshot ? "syncing" : "loading",
                  reason: null,
                }));
              }
            }),
          ),
          Stream.takeUntil(() => retry || terminal),
          Stream.runDrain,
          Effect.ensuring(completeObservation),
          Effect.exit,
        );
        if (!(yield* ownsSession(session))) return;
        if (Exit.isFailure(result)) {
          if (Cause.hasInterrupts(result.cause)) return yield* Effect.interrupt;
          const failuresOnly = result.cause.reasons.filter((reason) => reason._tag === "Fail");
          const expected = failuresOnly.length === result.cause.reasons.length;
          const unauthorized = failuresOnly.some(
            (reason) => reason.error._tag === "EnvironmentAuthorizationError",
          );
          if (unauthorized) {
            yield* clear("unauthorized", "unauthorized");
            yield* Effect.logWarning("Attention access revoked.", { environmentId });
            return;
          }
          const transport =
            expected &&
            failuresOnly.length > 0 &&
            failuresOnly.every((reason) => isRpcClientError(reason.error));
          const unavailable =
            expected &&
            failuresOnly.length > 0 &&
            failuresOnly.every(
              (reason) =>
                reason.error._tag === "AttentionSyncError" && reason.error.reason === "unavailable",
            );
          sync = attentionSyncFailed(sync, "disconnected");
          yield* Effect.logWarning("Attention subscription failed.", {
            environmentId,
            transport,
            unavailable,
          });
          if (transport) {
            yield* markStale("transport-unavailable");
            return;
          }
          if (!unavailable) {
            yield* SubscriptionRef.update(state, (current): EnvironmentAttentionState => ({
              ...current,
              status: "error",
              reason: "attention-protocol-error",
            }));
            return;
          }
          yield* markStale("attention-unavailable");
        } else if (terminal) {
          return;
        } else if (!retry) {
          sync = attentionSyncFailed(sync, "disconnected");
          yield* markStale("stream-ended");
          yield* Effect.logWarning("Attention subscription ended before its connection.", {
            environmentId,
          });
        }
        yield* Effect.sleep(retryDelayMs(failures++));
      }
    });

    yield* Stream.merge(
      SubscriptionRef.changes(supervisor.session),
      SubscriptionRef.changes(supervisor.state),
    ).pipe(
      Stream.mapEffect(() =>
        Effect.gen(function* () {
          const session = yield* SubscriptionRef.get(supervisor.session);
          const unauthorized = authorizationLost(yield* SubscriptionRef.get(supervisor.state));
          return { session: Option.getOrNull(session), unauthorized };
        }),
      ),
      Stream.changesWith(
        (left, right) => left.session === right.session && left.unauthorized === right.unauthorized,
      ),
      Stream.switchMap(({ session, unauthorized }) =>
        Stream.fromEffect(
          unauthorized
            ? clear("unauthorized", "unauthorized")
            : session !== null
              ? consume(session)
              : Effect.gen(function* () {
                  sync = attentionSyncFailed(sync, "disconnected");
                  yield* markStale("disconnected");
                }),
        ),
      ),
      Stream.runDrain,
      Effect.forkScoped,
    );
    return state;
  },
);

const EMPTY_WORKSPACE: AttentionWorkspaceState = { isReady: false, environments: new Map() };

export const makeAttentionWorkspaceState = Effect.fn("makeAttentionWorkspaceState")(function* () {
  const registry = yield* EnvironmentRegistry;
  const state = yield* SubscriptionRef.make(EMPTY_WORKSPACE);
  const workers = new Map<
    EnvironmentId,
    {
      entry: ConnectionCatalogEntry;
      fiber?: Fiber.Fiber<void, never>;
    }
  >();
  yield* SubscriptionRef.changes(registry.entries).pipe(
    Stream.runForEach((entries) =>
      Effect.gen(function* () {
        const retired = [...workers].filter(
          ([id, worker]) =>
            !entries.get(id)?.enabled || !Equal.equals(entries.get(id), worker.entry),
        );
        for (const [id] of retired) workers.delete(id);
        yield* SubscriptionRef.update(state, (current) => ({
          isReady: true,
          environments: new Map(
            [...entries]
              .filter(([, entry]) => entry.enabled)
              .map(([id]) => [
                id,
                workers.has(id)
                  ? (current.environments.get(id) ?? emptyEnvironmentAttention())
                  : emptyEnvironmentAttention(),
              ]),
          ),
        }));
        yield* Effect.forEach(
          retired,
          ([, worker]) =>
            worker.fiber === undefined ? Effect.void : Fiber.interrupt(worker.fiber),
          {
            discard: true,
          },
        );
        for (const [id, entry] of entries) {
          if (!entry.enabled || workers.has(id)) continue;
          const worker: { entry: ConnectionCatalogEntry; fiber?: Fiber.Fiber<void, never> } = {
            entry,
          };
          workers.set(id, worker);
          worker.fiber = yield* registry
            .runStream(
              id,
              Stream.unwrap(
                makeEnvironmentAttentionState().pipe(Effect.map(SubscriptionRef.changes)),
              ),
            )
            .pipe(
              Stream.runForEach((value) =>
                SubscriptionRef.update(state, (current) => {
                  if (workers.get(id) !== worker) return current;
                  const environments = new Map(current.environments);
                  environments.set(id, value);
                  return { ...current, environments };
                }),
              ),
              Effect.catchTag("EnvironmentNotRegisteredError", () =>
                Effect.gen(function* () {
                  if (!(yield* SubscriptionRef.get(registry.entries)).get(id)?.enabled) return;
                  yield* Effect.logWarning("Attention environment is no longer registered.", {
                    environmentId: id,
                  });
                  yield* SubscriptionRef.update(state, (current) => {
                    if (workers.get(id) !== worker) return current;
                    const environments = new Map(current.environments);
                    environments.set(id, {
                      ...emptyEnvironmentAttention(),
                      status: "error",
                      reason: "environment-unavailable",
                    });
                    return { ...current, environments };
                  });
                }),
              ),
              Effect.forkScoped,
            );
        }
      }),
    ),
    Effect.forkScoped,
  );
  return state;
});

/** One shared workspace atom owns all enabled-environment subscriptions for its consumers. */
export function createAttentionWorkspaceAtoms<R, E>(
  runtime: Atom.AtomRuntime<EnvironmentRegistry | R, E>,
) {
  const stateAtom = runtime.atom(
    Stream.unwrap(makeAttentionWorkspaceState().pipe(Effect.map(SubscriptionRef.changes))),
    { initialValue: EMPTY_WORKSPACE },
  );
  const valueAtom = Atom.make((get) =>
    Option.getOrElse(AsyncResult.value(get(stateAtom)), () => EMPTY_WORKSPACE),
  ).pipe(Atom.withLabel("attention-workspace"));
  const aggregateAtom = Atom.make((get) => aggregateAttention(get(valueAtom))).pipe(
    Atom.withLabel("attention-aggregate"),
  );
  return { stateAtom, valueAtom, aggregateAtom };
}

export * from "./attentionProjection.ts";
