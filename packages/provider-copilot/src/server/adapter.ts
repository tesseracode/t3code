import type {
  CopilotClient,
  CopilotClientOptions,
  CopilotSession,
  SessionConfig,
  SessionEvent,
  MessageOptions,
  PermissionRequest,
  ResumeSessionConfig,
  SkillsLoadedSkill,
} from "@github/copilot-sdk";
import {
  MessageId,
  NodeId,
  PlanId,
  ProviderDriverKind,
  ProviderTurnId,
  RuntimeRequestId,
  TurnItemId,
  type ModelSelection,
  type OrchestrationV2ConversationMessage,
  type OrchestrationV2ExecutionNode,
  type OrchestrationV2ProviderThread,
  type OrchestrationV2ProviderTurn,
  type OrchestrationV2RuntimeRequest,
  type OrchestrationV2TurnItem,
  type ProviderInstanceId,
  type OrchestrationV2Subagent,
  type ServerProviderSkill,
} from "@t3tools/contracts";
import { getModelSelectionStringOptionValue } from "@t3tools/shared/model";
import * as DateTime from "effect/DateTime";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Queue from "effect/Queue";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";
import * as ProviderAdapter from "@t3tools/provider-core/server/ProviderAdapter";
import * as ProviderHost from "@t3tools/provider-core/server/ProviderHost";
import * as McpProviderSessions from "@t3tools/provider-core/server/McpProviderSessions";
import * as ProviderEventLoggers from "@t3tools/provider-core/server/ProviderEventLoggers";
import { summarizeNativeProtocolPayload } from "@t3tools/provider-core/server/nativeProtocolLogging";
import { derive } from "@t3tools/provider-core/server/IdAllocator";
import { makeProviderFailure } from "@t3tools/provider-core/server/failure";
import { turnScopedSelectionTransition } from "@t3tools/provider-core/server/selectionTransition";
import { providerMessageTextWithAttachmentPaths } from "@t3tools/provider-core/server/attachmentPrompt";
import { buildRuntimeInstructions } from "@t3tools/provider-core/server/runtimeInstructions";
import { t3OrchestrationSystemPrompt } from "@t3tools/provider-core/server/orchestrationInstructions";
import type { CopilotSettings } from "../settings.ts";
import { capabilities } from "./capabilities.ts";
import { createClient, resolveClientConfiguration } from "./client.ts";
import { skillsFromSdk } from "./status.ts";
import { nativeToolItem } from "./tools.ts";

export const COPILOT_DRIVER = ProviderDriverKind.make("githubCopilot");
const ref = (nativeId: string) => ({
  driver: COPILOT_DRIVER,
  nativeId,
  strength: "strong" as const,
});
type UserInput = Parameters<NonNullable<SessionConfig["onUserInputRequest"]>>[0];
type UserAnswer = Awaited<ReturnType<NonNullable<SessionConfig["onUserInputRequest"]>>>;
type ExitPlan = Parameters<NonNullable<SessionConfig["onExitPlanModeRequest"]>>[0];
type ExitPlanAnswer = Awaited<ReturnType<NonNullable<SessionConfig["onExitPlanModeRequest"]>>>;
type Rpc = CopilotSession["rpc"];
type Task = Awaited<ReturnType<Rpc["tasks"]["list"]>>["tasks"][number];
export type SessionHandle = Pick<
  CopilotSession,
  "sessionId" | "send" | "abort" | "disconnect" | "getEvents" | "setModel"
> & {
  readonly rpc: {
    readonly mode: Pick<Rpc["mode"], "set">;
    readonly plan: Pick<Rpc["plan"], "read">;
    readonly skills: Pick<Rpc["skills"], "list">;
    readonly tasks: Pick<Rpc["tasks"], "list" | "cancel">;
    readonly permissions: Pick<Rpc["permissions"], "handlePendingPermissionRequest">;
  };
};
export type ClientHandle = Pick<CopilotClient, "start" | "stop" | "forceStop"> & {
  readonly createSession: (config: SessionConfig) => Promise<SessionHandle>;
  readonly resumeSession: (id: string, config: ResumeSessionConfig) => Promise<SessionHandle>;
};
export interface AdapterOptions {
  readonly clientFactory?: (options: CopilotClientOptions) => ClientHandle;
  readonly onSkills?: (cwd: string, skills: ReadonlyArray<ServerProviderSkill> | null) => void;
}

function permissionPrompt(request: PermissionRequest): string {
  switch (request.kind) {
    case "shell":
      return request.fullCommandText.slice(0, 2_000);
    case "read":
      return `Read ${request.path}`.slice(0, 2_000);
    case "write":
      return `Write ${request.fileName}`.slice(0, 2_000);
    case "mcp":
      return `${request.serverName}: ${request.toolTitle}`.slice(0, 2_000);
    case "custom-tool":
      return (request.toolDescription || request.toolName).slice(0, 2_000);
    default:
      return `Allow Copilot ${request.kind}?`;
  }
}

interface ActiveTurn {
  readonly input: ProviderAdapter.ProviderAdapterV2TurnInput;
  providerTurn: OrchestrationV2ProviderTurn;
  nextOrdinal: number;
  readonly items: Map<string, OrchestrationV2TurnItem>;
  accepted: boolean;
  idle: boolean;
  interrupted: boolean;
  finished: boolean;
}
type PendingResponse = {
  readonly owner: ActiveTurn;
  readonly nativePermissionId?: string;
  responseOwnedByV2?: true;
  permissionReplyKey?: string;
  permissionReplyReceipt?: Deferred.Deferred<void, ProviderAdapter.ProviderAdapterV2Error>;
  readonly request: OrchestrationV2RuntimeRequest;
  readonly item: OrchestrationV2TurnItem;
  readonly node: OrchestrationV2ExecutionNode;
  readonly resolve: (input: ProviderAdapter.ProviderAdapterV2RuntimeRequestResponseInput) => void;
  readonly cancel: () => void;
};
type Ingress =
  | { readonly type: "event"; readonly event: SessionEvent }
  | {
      readonly type: "request";
      readonly kind: "permission";
      readonly request: PermissionRequest;
      readonly nativeRequestId: string;
    }
  | {
      readonly type: "request";
      readonly kind: "input";
      readonly request: UserInput;
      readonly resolve: (result: UserAnswer) => void;
    }
  | {
      readonly type: "request";
      readonly kind: "plan";
      readonly request: ExitPlan;
      readonly resolve: (result: ExitPlanAnswer) => void;
    }
  | { readonly type: "accepted" }
  | { readonly type: "drain"; readonly receipt: Deferred.Deferred<void> };

export function reasoningEffort(selection: ModelSelection): SessionConfig["reasoningEffort"] {
  const effort = getModelSelectionStringOptionValue(selection, "reasoningEffort");
  switch (effort) {
    case "low":
    case "medium":
    case "high":
    case "xhigh":
      return effort;
    default:
      return undefined;
  }
}

export const makeAdapter = Effect.fn("CopilotAdapter.make")(function* (
  input: {
    readonly instanceId: ProviderInstanceId;
    readonly settings: CopilotSettings;
    readonly environment: NodeJS.ProcessEnv;
  },
  options: AdapterOptions = {},
) {
  const host = yield* ProviderHost.ProviderHost;
  const mcpSessions = yield* McpProviderSessions.McpProviderSessions;
  const loggers = yield* Effect.serviceOption(ProviderEventLoggers.ProviderEventLoggers);
  const nativeLogger = Option.getOrUndefined(loggers)?.native;
  return ProviderAdapter.ProviderAdapterV2.of({
    instanceId: input.instanceId,
    driver: COPILOT_DRIVER,
    getCapabilities: Effect.fn("CopilotAdapter.getCapabilities")(() =>
      Effect.succeed(capabilities),
    ),
    planSelectionTransition: Effect.fn("CopilotAdapter.planSelectionTransition")(() =>
      Effect.succeed(turnScopedSelectionTransition()),
    ),
    openSession: Effect.fn("CopilotAdapter.openSession")(function* (open) {
      const cwd = open.runtimePolicy.cwd ?? host.paths.cwd;
      const events = yield* Queue.unbounded<ProviderAdapter.ProviderAdapterV2Event>();
      const inbox = yield* Queue.unbounded<Ingress>();
      const now = yield* DateTime.now;
      const providerSession = {
        id: open.providerSessionId,
        driver: COPILOT_DRIVER,
        providerInstanceId: input.instanceId,
        status: "ready" as const,
        cwd,
        model: open.modelSelection.model,
        capabilities,
        createdAt: now,
        updatedAt: now,
        lastError: null,
      };
      let native: SessionHandle | undefined;
      let providerThread: OrchestrationV2ProviderThread | undefined;
      let active: ActiveTurn | undefined;
      let lastTurn: ActiveTurn | undefined;
      let stopped = false;
      let alreadyInUse = false;
      let history = "";
      const seen = new Set<string>();
      const turns = new Map<string, OrchestrationV2ProviderTurn>();
      const messages = new Map<string, OrchestrationV2ConversationMessage>();
      const pending = new Map<RuntimeRequestId, PendingResponse>();
      const confirmedPermissionReplies = new Map<RuntimeRequestId, string>();
      const sdkOwnedPermissionRequests = new WeakSet<PermissionRequest>();
      const tasks = new Map<string, Task>();
      const subagents = new Map<string, OrchestrationV2Subagent>();
      const taskOwners = new Map<string, ActiveTurn>();
      const emit = (event: ProviderAdapter.ProviderAdapterV2Event) =>
        Queue.offer(events, event).pipe(Effect.asVoid);
      const sdk = <A>(operation: string, request: () => Promise<A>, timeoutMs = 10_000) =>
        Effect.tryPromise({
          try: request,
          catch: (cause) =>
            new ProviderAdapter.ProviderAdapterProtocolError({
              driver: COPILOT_DRIVER,
              detail: `Copilot ${operation} failed`,
              cause,
            }),
        }).pipe(
          Effect.timeoutOption(timeoutMs),
          Effect.flatMap((result) =>
            Effect.fromOption(result).pipe(
              Effect.mapError(
                () =>
                  new ProviderAdapter.ProviderAdapterProtocolError({
                    driver: COPILOT_DRIVER,
                    detail: `Copilot ${operation} timed out`,
                  }),
              ),
            ),
          ),
        );
      const decidePermission = (
        requestId: string,
        result: Parameters<Rpc["permissions"]["handlePendingPermissionRequest"]>[0]["result"],
      ) =>
        sdk("permission response", () =>
          native!.rpc.permissions.handlePendingPermissionRequest({
            requestId,
            result,
          }),
        ).pipe(
          Effect.flatMap((receipt) =>
            receipt.success
              ? Effect.void
              : Effect.fail(
                  new ProviderAdapter.ProviderAdapterProtocolError({
                    driver: COPILOT_DRIVER,
                    detail: "Copilot permission request was already resolved",
                  }),
                ),
          ),
        );
      const config = yield* Effect.try({
        try: () =>
          resolveClientConfiguration({
            settings: input.settings,
            cwd,
            environment: input.environment,
          }),
        catch: (cause) =>
          new ProviderAdapter.ProviderAdapterOpenSessionError({
            driver: COPILOT_DRIVER,
            providerSessionId: open.providerSessionId,
            cause,
          }),
      });
      const client = yield* Effect.try({
        try: () => (options.clientFactory ?? createClient)(config.options),
        catch: (cause) =>
          new ProviderAdapter.ProviderAdapterOpenSessionError({
            driver: COPILOT_DRIVER,
            providerSessionId: open.providerSessionId,
            cause,
          }),
      });
      const settlePending = Effect.fnUntraced(function* () {
        const now = yield* DateTime.now;
        for (const [requestId, entry] of pending) {
          if (entry.responseOwnedByV2) continue;
          pending.delete(requestId);
          entry.cancel();
          entry.owner.items.set(entry.request.id, {
            ...entry.item,
            status: "cancelled",
            completedAt: now,
            updatedAt: now,
          });
          yield* emit({
            type: "runtime_request.updated",
            driver: COPILOT_DRIVER,
            threadId: open.threadId,
            runtimeRequest: { ...entry.request, status: "cancelled", resolvedAt: now },
          });
          yield* emit({
            type: "turn_item.updated",
            driver: COPILOT_DRIVER,
            turnItem: { ...entry.item, status: "cancelled", completedAt: now, updatedAt: now },
          });
          yield* emit({
            type: "node.updated",
            driver: COPILOT_DRIVER,
            node: { ...entry.node, status: "cancelled", completedAt: now },
          });
        }
      });
      yield* Effect.addFinalizer(() =>
        Effect.gen(function* () {
          stopped = true;
          options.onSkills?.(cwd, null);
          yield* settlePending();
          const disconnected = native
            ? yield* sdk("disconnect", () => native!.disconnect(), 5_000).pipe(Effect.result)
            : undefined;
          const stoppedClient = yield* sdk("stop", () => client.stop()).pipe(Effect.result);
          if (
            disconnected?._tag === "Failure" ||
            stoppedClient._tag === "Failure" ||
            stoppedClient.success.length
          ) {
            yield* sdk("force stop", () => client.forceStop(), 5_000).pipe(Effect.ignore);
          }
          yield* Queue.shutdown(inbox);
          yield* Queue.shutdown(events);
        }),
      );
      yield* sdk("start", () => client.start(), 30_000);

      const updateThread = Effect.fnUntraced(function* (
        patch: Partial<OrchestrationV2ProviderThread>,
      ) {
        if (!providerThread) return;
        providerThread = { ...providerThread, ...patch, updatedAt: yield* DateTime.now };
        yield* emit({ type: "provider_thread.updated", driver: COPILOT_DRIVER, providerThread });
      });
      const baseItem = (turn: ActiveTurn, id: string, nativeId?: string) => {
        const existing = turn.items.get(id);
        return {
          id: TurnItemId.make(`${turn.providerTurn.id}:${id}`),
          threadId: turn.input.threadId,
          runId: turn.input.runId,
          nodeId: turn.input.rootNodeId,
          providerThreadId: turn.input.providerThread.id,
          providerTurnId: turn.providerTurn.id,
          nativeItemRef: nativeId ? ref(nativeId) : null,
          parentItemId: null,
          ordinal: existing?.ordinal ?? turn.nextOrdinal++,
          status: "running" as const,
          title: null,
          startedAt: turn.providerTurn.startedAt,
          completedAt: null,
          updatedAt: turn.providerTurn.startedAt!,
        };
      };
      const putItem = (turn: ActiveTurn, key: string, item: OrchestrationV2TurnItem) =>
        Effect.sync(() => {
          turn.items.set(key, item);
        }).pipe(
          Effect.andThen(
            emit({ type: "turn_item.updated", driver: COPILOT_DRIVER, turnItem: item }),
          ),
        );
      const terminal = Effect.fnUntraced(function* (turn: ActiveTurn, failure?: unknown) {
        if (turn.finished || (!failure && !turn.accepted)) return;
        turn.finished = true;
        const now = yield* DateTime.now;
        const status = failure
          ? ("failed" as const)
          : turn.interrupted
            ? ("interrupted" as const)
            : ("completed" as const);
        yield* settlePending();
        for (const [key, item] of turn.items) {
          if (item.type === "subagent") continue;
          if (
            (item.type === "approval_request" || item.type === "user_input_request") &&
            pending.get(item.requestId)?.responseOwnedByV2
          )
            continue;
          if (item.status !== "running" && item.status !== "pending") continue;
          yield* putItem(turn, key, {
            ...item,
            status,
            completedAt: now,
            updatedAt: now,
            ...("streaming" in item ? { streaming: false } : {}),
          });
        }
        for (const [id, message] of messages) {
          if (message.runId !== turn.input.runId || !message.streaming) continue;
          const completed = { ...message, streaming: false, updatedAt: now };
          messages.set(id, completed);
          yield* emit({ type: "message.updated", driver: COPILOT_DRIVER, message: completed });
        }
        turn.providerTurn = { ...turn.providerTurn, status, completedAt: now };
        turns.set(turn.providerTurn.id, turn.providerTurn);
        yield* emit({
          type: "provider_turn.updated",
          driver: COPILOT_DRIVER,
          threadId: open.threadId,
          providerTurn: turn.providerTurn,
        });
        yield* updateThread({ status: failure ? "error" : "idle" });
        const common = {
          type: "turn.terminal" as const,
          driver: COPILOT_DRIVER,
          providerThreadId: turn.providerTurn.providerThreadId,
          providerTurnId: turn.providerTurn.id,
          runOrdinal: turn.input.runOrdinal,
        };
        yield* emit(
          failure
            ? {
                ...common,
                status: "failed",
                failure: makeProviderFailure({ cause: failure }),
                failureItemOrdinal: turn.nextOrdinal++,
                threadDisposition: "broken",
              }
            : {
                ...common,
                status: turn.interrupted ? "interrupted" : "completed",
                failure: null,
                threadDisposition: "reusable",
              },
        );
        active = undefined;
      });

      const refreshTasks = Effect.fnUntraced(function* () {
        if (!native || !providerThread) return;
        const listed = yield* sdk("list tasks", () => native!.rpc.tasks.list());
        tasks.clear();
        const now = yield* DateTime.now;
        for (const task of listed.tasks) {
          tasks.set(task.id, task);
          const turn = taskOwners.get(task.id) ?? active ?? lastTurn;
          if (task.type !== "agent" || !turn) continue;
          taskOwners.set(task.id, turn);
          const status =
            task.status === "running"
              ? "running"
              : task.status === "idle"
                ? "idle"
                : task.status === "completed"
                  ? "completed"
                  : task.status === "cancelled"
                    ? "cancelled"
                    : "failed";
          const previous = subagents.get(task.id);
          const subagent: OrchestrationV2Subagent = {
            id: NodeId.make(`${open.providerSessionId}:task:${task.id}`),
            threadId: turn.input.threadId,
            runId: turn.input.runId,
            parentNodeId: turn.input.rootNodeId,
            origin: "provider_native",
            createdBy: "agent",
            driver: COPILOT_DRIVER,
            providerInstanceId: input.instanceId,
            providerThreadId: providerThread.id,
            childThreadId: null,
            nativeTaskRef: ref(task.id),
            prompt: task.description ?? "",
            title: task.description ?? task.agentType,
            model: task.resolvedModel ?? task.model ?? null,
            status,
            result: task.result ?? task.latestResponse ?? task.error ?? null,
            startedAt: previous?.startedAt ?? now,
            completedAt: ["running", "idle"].includes(status) ? null : now,
            updatedAt: now,
          };
          subagents.set(task.id, subagent);
          yield* emit({ type: "subagent.updated", driver: COPILOT_DRIVER, subagent });
          yield* emit({
            type: "node.updated",
            driver: COPILOT_DRIVER,
            node: {
              id: subagent.id,
              threadId: turn.input.threadId,
              runId: turn.input.runId,
              parentNodeId: turn.input.rootNodeId,
              rootNodeId: turn.input.rootNodeId,
              kind: "subagent",
              status,
              countsForRun: false,
              providerThreadId: providerThread.id,
              providerTurnId: turn.providerTurn.id,
              nativeItemRef: ref(task.id),
              runtimeRequestId: null,
              checkpointScopeId: null,
              startedAt: subagent.startedAt,
              completedAt: subagent.completedAt,
            },
          });
          yield* putItem(turn, `task:${task.id}`, {
            ...baseItem(turn, `task:${task.id}`, task.id),
            type: "subagent",
            subagentId: subagent.id,
            origin: "provider_native",
            driver: COPILOT_DRIVER,
            providerInstanceId: input.instanceId,
            childThreadId: null,
            prompt: subagent.prompt,
            result: subagent.result,
            status,
            title: subagent.title,
            updatedAt: now,
            completedAt: subagent.completedAt,
          });
        }
        for (const [id, previous] of subagents) {
          if (tasks.has(id) || !["running", "idle", "waiting", "pending"].includes(previous.status))
            continue;
          const subagent = {
            ...previous,
            status: "interrupted" as const,
            completedAt: now,
            updatedAt: now,
          };
          subagents.set(id, subagent);
          yield* emit({ type: "subagent.updated", driver: COPILOT_DRIVER, subagent });
          const owner = taskOwners.get(id);
          const item = owner?.items.get(`task:${id}`);
          if (owner && item)
            yield* putItem(owner, `task:${id}`, {
              ...item,
              status: "interrupted",
              completedAt: now,
              updatedAt: now,
            });
          if (owner)
            yield* emit({
              type: "node.updated",
              driver: COPILOT_DRIVER,
              node: {
                id: subagent.id,
                threadId: owner.input.threadId,
                runId: owner.input.runId,
                parentNodeId: owner.input.rootNodeId,
                rootNodeId: owner.input.rootNodeId,
                kind: "subagent",
                status: "interrupted",
                countsForRun: false,
                providerThreadId: providerThread.id,
                providerTurnId: owner.providerTurn.id,
                nativeItemRef: ref(id),
                runtimeRequestId: null,
                checkpointScopeId: null,
                startedAt: subagent.startedAt,
                completedAt: now,
              },
            });
        }
        yield* updateThread({
          pendingBackgroundTasks: listed.tasks
            .filter((task) => task.status === "running" || task.status === "idle")
            .map((task) => ({
              taskId: task.id,
              kind: task.type === "agent" ? ("subagent" as const) : ("command" as const),
              ...(task.description ? { description: task.description } : {}),
            })),
        });
      });
      const refreshPlan = Effect.fnUntraced(function* () {
        const turn = active ?? lastTurn;
        if (!native || !turn) return;
        const plan = yield* sdk("read plan", () => native!.rpc.plan.read());
        if (!plan.exists || !plan.content) return;
        const planId = PlanId.make(`${turn.providerTurn.id}:plan`);
        yield* emit({
          type: "plan.updated",
          driver: COPILOT_DRIVER,
          plan: {
            id: planId,
            threadId: turn.input.threadId,
            runId: turn.input.runId,
            nodeId: turn.input.rootNodeId,
            status: "draft",
            kind: "proposed_plan",
            markdown: plan.content,
          },
        });
        yield* putItem(turn, "plan", {
          ...baseItem(turn, "plan"),
          type: "proposed_plan",
          planId,
          markdown: plan.content,
          streaming: false,
          status: "completed",
          completedAt: yield* DateTime.now,
        });
      });
      const textEvent = Effect.fnUntraced(function* (
        turn: ActiveTurn,
        key: string,
        text: string,
        final: boolean,
        reasoning: boolean,
      ) {
        const previous = turn.items.get(key);
        if (text.length === 0 && (!final || previous === undefined)) return;
        const content =
          final && text.length > 0
            ? text
            : (previous && "text" in previous ? previous.text : "") + text;
        const now = yield* DateTime.now;
        const base = {
          ...baseItem(turn, key, key),
          updatedAt: now,
          status: final ? ("completed" as const) : ("running" as const),
          completedAt: final ? now : null,
        };
        if (reasoning) {
          yield* putItem(turn, key, {
            ...base,
            type: "reasoning",
            text: content,
            streaming: !final,
          });
        } else {
          const messageId = MessageId.make(`${turn.providerTurn.id}:${key}`);
          const message: OrchestrationV2ConversationMessage = {
            createdBy: "agent",
            creationSource: "provider",
            id: messageId,
            threadId: turn.input.threadId,
            runId: turn.input.runId,
            nodeId: turn.input.rootNodeId,
            role: "assistant",
            text: content,
            attachments: [],
            streaming: !final,
            createdAt: messages.get(messageId)?.createdAt ?? now,
            updatedAt: now,
          };
          messages.set(messageId, message);
          yield* emit({ type: "message.updated", driver: COPILOT_DRIVER, message });
          yield* putItem(turn, key, {
            ...base,
            type: "assistant_message",
            messageId,
            text: content,
            streaming: !final,
          });
        }
      });
      const onEvent = Effect.fnUntraced(function* (event: SessionEvent) {
        if (stopped || seen.has(event.id)) return;
        seen.add(event.id);
        if (nativeLogger)
          yield* nativeLogger.write(
            {
              source: "copilot.sdk",
              providerInstanceId: input.instanceId,
              type: event.type,
              eventId: event.id,
              child: event.agentId !== undefined,
              payload: summarizeNativeProtocolPayload(event.data),
            },
            open.threadId,
          );
        if (event.type === "permission.requested") {
          if (
            !event.data.resolvedByHook &&
            !sdkOwnedPermissionRequests.has(event.data.permissionRequest) &&
            ![...pending.values()].some(
              (entry) => entry.nativePermissionId === event.data.requestId,
            )
          )
            yield* onRequest({
              type: "request",
              kind: "permission",
              request: event.data.permissionRequest,
              nativeRequestId: event.data.requestId,
            }).pipe(Effect.catch((cause) => (active ? terminal(active, cause) : Effect.void)));
          return;
        }
        // Child events never advance or complete the root's user-turn lifecycle.
        if (event.agentId) {
          if (
            event.type === "assistant.message" ||
            event.type === "assistant.idle" ||
            event.type === "session.idle" ||
            event.type === "assistant.turn_end" ||
            event.type.startsWith("subagent.") ||
            event.type === "session.background_tasks_changed" ||
            event.type === "session.error"
          ) {
            yield* refreshTasks().pipe(Effect.ignore);
          }
          return;
        }
        const turn = active;
        switch (event.type) {
          case "session.skills_loaded":
            options.onSkills?.(cwd, skillsFromSdk(event.data.skills));
            return;
          case "session.background_tasks_changed":
          case "subagent.started":
          case "subagent.completed":
          case "subagent.failed":
          case "session.task_complete":
            yield* refreshTasks().pipe(Effect.ignore);
            return;
          case "session.plan_changed":
            yield* refreshPlan().pipe(Effect.ignore);
            return;
          case "session.idle":
            if (!turn) return;
            turn.idle = true;
            yield* refreshTasks().pipe(Effect.ignore);
            yield* terminal(turn);
            return;
          case "session.error":
            if (turn) yield* terminal(turn, new Error(event.data.message));
            return;
          case "session.shutdown": {
            const failed = event.data.shutdownType === "error";
            if (turn) {
              turn.accepted = true;
              turn.interrupted = true;
              yield* terminal(
                turn,
                failed
                  ? new Error(event.data.errorReason ?? "Copilot runtime shut down.")
                  : undefined,
              );
            }
            stopped = true;
            options.onSkills?.(cwd, null);
            yield* updateThread({ status: failed ? "error" : "closed" });
            yield* emit({
              type: "provider_session.updated",
              driver: COPILOT_DRIVER,
              providerSession: {
                ...providerSession,
                status: failed ? "error" : "stopped",
                updatedAt: yield* DateTime.now,
                lastError: failed ? "Copilot runtime shut down." : null,
              },
            });
            return;
          }
          case "assistant.message_delta":
            if (turn)
              yield* textEvent(turn, event.data.messageId, event.data.deltaContent, false, false);
            return;
          case "assistant.message":
            if (turn) yield* textEvent(turn, event.data.messageId, event.data.content, true, false);
            return;
          case "assistant.reasoning_delta":
            if (turn)
              yield* textEvent(
                turn,
                `reasoning:${event.data.reasoningId}`,
                event.data.deltaContent,
                false,
                true,
              );
            return;
          case "assistant.reasoning":
            if (turn)
              yield* textEvent(
                turn,
                `reasoning:${event.data.reasoningId}`,
                event.data.content,
                true,
                true,
              );
            return;
          case "tool.execution_start":
            if (turn)
              yield* putItem(
                turn,
                event.data.toolCallId,
                nativeToolItem(
                  {
                    ...baseItem(turn, event.data.toolCallId, event.data.toolCallId),
                    title: event.data.toolName,
                  },
                  event.data,
                ),
              );
            return;
          case "tool.execution_partial_result": {
            if (!turn) return;
            const previous = turn.items.get(event.data.toolCallId);
            if (previous?.type !== "dynamic_tool" && previous?.type !== "command_execution") return;
            const output =
              `${typeof previous.output === "string" ? previous.output : ""}${event.data.partialOutput}`.slice(
                -20_000,
              );
            if (previous.type === "command_execution") {
              turn.items.set(event.data.toolCallId, {
                ...previous,
                output,
                updatedAt: yield* DateTime.now,
              });
              yield* emit({
                type: "command_output.delta",
                driver: COPILOT_DRIVER,
                threadId: turn.input.threadId,
                itemId: previous.id,
                chunk: event.data.partialOutput.slice(0, 8_000),
              });
              return;
            }
            yield* putItem(turn, event.data.toolCallId, {
              ...previous,
              output,
              updatedAt: yield* DateTime.now,
            });
            return;
          }
          case "tool.execution_complete": {
            if (!turn) return;
            const previous = turn.items.get(event.data.toolCallId);
            if (!previous) return;
            const now = yield* DateTime.now;
            const output = (
              event.data.result?.detailedContent ??
              event.data.result?.content ??
              event.data.error?.message ??
              ""
            ).slice(0, 20_000);
            if (previous.type === "web_search") {
              yield* putItem(turn, event.data.toolCallId, {
                ...previous,
                status: event.data.success ? "completed" : "failed",
                ...(output ? { results: [{ snippet: output }] } : {}),
                completedAt: now,
                updatedAt: now,
              });
              return;
            }
            yield* putItem(turn, event.data.toolCallId, {
              ...previous,
              status: event.data.success ? "completed" : "failed",
              ...(previous.type === "dynamic_tool" || previous.type === "command_execution"
                ? { output }
                : {}),
              completedAt: now,
              updatedAt: now,
            });
            return;
          }
          case "hook.start":
          case "hook.end":
            if (turn) {
              const ended = event.type === "hook.end";
              yield* putItem(turn, `hook:${event.data.hookInvocationId}`, {
                ...baseItem(
                  turn,
                  `hook:${event.data.hookInvocationId}`,
                  event.data.hookInvocationId,
                ),
                type: "system_notice",
                title: `Hook: ${event.data.hookType}`,
                message:
                  ended && event.data.error
                    ? event.data.error.message.slice(0, 2_000)
                    : event.data.hookType,
                status: ended ? (event.data.success ? "completed" : "failed") : "running",
                completedAt: ended ? yield* DateTime.now : null,
              });
            }
            return;
          case "session.truncation":
            yield* updateThread({
              contextUsage: {
                usedTokens: Math.max(0, Math.trunc(event.data.postTruncationTokensInMessages)),
                maxTokens: Math.max(1, Math.trunc(event.data.tokenLimit)),
                compactsAutomatically: true,
              },
            });
            if (turn)
              yield* putItem(turn, `truncation:${event.id}`, {
                ...baseItem(turn, `truncation:${event.id}`),
                type: "compaction",
                driver: COPILOT_DRIVER,
                summary: "Native context truncation",
                beforeTokenCount: event.data.preTruncationTokensInMessages,
                afterTokenCount: event.data.postTruncationTokensInMessages,
                status: "completed",
                completedAt: yield* DateTime.now,
              });
            return;
          case "session.compaction_start":
          case "session.compaction_complete":
            if (turn) {
              const complete = event.type === "session.compaction_complete";
              yield* putItem(turn, "compaction", {
                ...baseItem(turn, "compaction"),
                type: "compaction",
                driver: COPILOT_DRIVER,
                status: complete ? (event.data.success ? "completed" : "failed") : "running",
                completedAt: complete ? yield* DateTime.now : null,
                ...(complete && event.data.summaryContent
                  ? { summary: event.data.summaryContent }
                  : {}),
                ...(complete && event.data.preCompactionTokens !== undefined
                  ? { beforeTokenCount: event.data.preCompactionTokens }
                  : {}),
                ...(complete && event.data.postCompactionTokens !== undefined
                  ? { afterTokenCount: event.data.postCompactionTokens }
                  : {}),
              });
            }
            return;
          case "session.usage_info":
            yield* updateThread({
              contextUsage: {
                usedTokens: Math.max(0, Math.trunc(event.data.currentTokens)),
                maxTokens: Math.max(1, Math.trunc(event.data.tokenLimit)),
                compactsAutomatically: true,
              },
            });
            return;
          case "assistant.usage":
            if (turn) {
              const previous = turn.providerTurn.tokenUsage;
              const inputTokens =
                (previous?.inputTokens ?? 0) + Math.max(0, Math.trunc(event.data.inputTokens ?? 0));
              const outputTokens =
                (previous?.outputTokens ?? 0) +
                Math.max(0, Math.trunc(event.data.outputTokens ?? 0));
              turn.providerTurn = {
                ...turn.providerTurn,
                tokenUsage: {
                  usedTokens: inputTokens + outputTokens,
                  inputTokens,
                  outputTokens,
                  cachedInputTokens:
                    (previous?.cachedInputTokens ?? 0) +
                    Math.max(0, Math.trunc(event.data.cacheReadTokens ?? 0)),
                  updatedAt: event.timestamp,
                },
              };
              turns.set(turn.providerTurn.id, turn.providerTurn);
              yield* emit({
                type: "provider_turn.updated",
                driver: COPILOT_DRIVER,
                threadId: open.threadId,
                providerTurn: turn.providerTurn,
              });
            }
            return;
          default:
            return;
        }
      });
      const onRequest = Effect.fnUntraced(function* (entry: Extract<Ingress, { type: "request" }>) {
        const turn = active;
        if (!turn || turn.finished || stopped) {
          if (entry.kind === "permission") {
            if (native && !stopped)
              yield* decidePermission(entry.nativeRequestId, { kind: "user-not-available" });
          } else if (entry.kind === "input") entry.resolve({ answer: "", wasFreeform: true });
          else entry.resolve({ approved: false });
          return;
        }
        if (
          entry.kind === "permission" &&
          (turn.input.runtimePolicy.runtimeMode === "full-access" ||
            (turn.input.runtimePolicy.runtimeMode === "auto-accept-edits" &&
              entry.request.kind === "write"))
        ) {
          yield* decidePermission(entry.nativeRequestId, { kind: "approve-once" });
          return;
        }
        const now = yield* DateTime.now;
        const id = RuntimeRequestId.make(`${turn.providerTurn.id}:request:${turn.nextOrdinal++}`);
        const nodeId = derive.approvalNode({ requestId: id });
        const requestKind =
          entry.kind === "permission"
            ? entry.request.kind === "read"
              ? ("file-read" as const)
              : entry.request.kind === "write"
                ? ("file-change" as const)
                : ("command" as const)
            : ("user_input" as const);
        const request: OrchestrationV2RuntimeRequest = {
          id,
          nodeId,
          providerTurnId: turn.providerTurn.id,
          nativeRequestRef: entry.kind === "permission" ? ref(entry.nativeRequestId) : null,
          kind: requestKind,
          status: "pending",
          responseCapability: { type: "live", providerSessionId: open.providerSessionId },
          createdAt: now,
          resolvedAt: null,
        };
        const node: OrchestrationV2ExecutionNode = {
          id: nodeId,
          threadId: turn.input.threadId,
          runId: turn.input.runId,
          parentNodeId: turn.input.rootNodeId,
          rootNodeId: turn.input.rootNodeId,
          kind: entry.kind === "permission" ? "approval_request" : "user_input_request",
          status: "waiting",
          countsForRun: false,
          providerThreadId: turn.input.providerThread.id,
          providerTurnId: turn.providerTurn.id,
          nativeItemRef: null,
          runtimeRequestId: id,
          checkpointScopeId: null,
          startedAt: now,
          completedAt: null,
        };
        const item: OrchestrationV2TurnItem =
          entry.kind === "permission"
            ? {
                ...baseItem(turn, id),
                type: "approval_request",
                nodeId,
                requestId: id,
                requestKind:
                  entry.request.kind === "read"
                    ? "file-read"
                    : entry.request.kind === "write"
                      ? "file-change"
                      : "command",
                prompt: permissionPrompt(entry.request),
                options: [
                  { decision: "accept", label: "Allow once" },
                  { decision: "decline", label: "Deny" },
                ],
              }
            : {
                ...baseItem(turn, id),
                type: "user_input_request",
                nodeId,
                requestId: id,
                questions: [
                  {
                    id: "answer",
                    header: entry.kind === "plan" ? "Plan" : "Question",
                    question:
                      entry.kind === "plan"
                        ? "Approve this plan and continue?"
                        : entry.request.question,
                    options:
                      entry.kind === "plan"
                        ? [
                            { label: "Approve", description: "Start implementation" },
                            { label: "Revise", description: "Stay in plan mode" },
                          ]
                        : (entry.request.choices ?? []).map((choice) => ({
                            label: choice,
                            description: choice,
                          })),
                    allowCustomAnswer:
                      entry.kind === "plan" || entry.request.allowFreeform !== false,
                  },
                ],
              };
        if (entry.kind === "plan") yield* refreshPlan().pipe(Effect.ignore);
        pending.set(id, {
          owner: turn,
          ...(entry.kind === "permission" ? { nativePermissionId: entry.nativeRequestId } : {}),
          request,
          item,
          node,
          resolve: (response) => {
            if (entry.kind !== "permission") {
              const answer = response.answers?.answer;
              const text =
                typeof answer === "string"
                  ? answer
                  : Array.isArray(answer)
                    ? answer.join(", ")
                    : "";
              if (entry.kind === "input")
                entry.resolve({
                  answer: text,
                  wasFreeform: !(entry.request.choices ?? []).includes(text),
                });
              else
                entry.resolve({
                  approved: text === "Approve",
                  ...(text === "Approve"
                    ? { selectedAction: entry.request.recommendedAction }
                    : {}),
                  ...(text && text !== "Approve" ? { feedback: text } : {}),
                });
            }
          },
          cancel: () => {
            if (entry.kind === "input") entry.resolve({ answer: "", wasFreeform: true });
            else if (entry.kind === "plan") entry.resolve({ approved: false });
          },
        });
        yield* emit({ type: "node.updated", driver: COPILOT_DRIVER, node });
        yield* emit({
          type: "runtime_request.updated",
          driver: COPILOT_DRIVER,
          threadId: open.threadId,
          runtimeRequest: request,
        });
        yield* putItem(turn, id, item);
      });
      yield* Stream.fromQueue(inbox).pipe(
        Stream.runForEach((entry) => {
          if (entry.type === "drain") return Deferred.succeed(entry.receipt, undefined);
          if (entry.type === "accepted") return active?.idle ? terminal(active) : Effect.void;
          return entry.type === "event" ? onEvent(entry.event) : onRequest(entry);
        }),
        Effect.forkScoped,
      );

      const drain = Effect.fnUntraced(function* () {
        const receipt = yield* Deferred.make<void>();
        yield* Queue.offer(inbox, { type: "drain", receipt });
        yield* Deferred.await(receipt).pipe(
          Effect.timeoutOption(15_000),
          Effect.flatMap((result) =>
            Effect.fromOption(result).pipe(
              Effect.mapError(
                () =>
                  new ProviderAdapter.ProviderAdapterProtocolError({
                    driver: COPILOT_DRIVER,
                    detail: "Copilot event drain timed out",
                  }),
              ),
            ),
          ),
        );
      });
      const ensureThread: ProviderAdapter.ProviderAdapterV2SessionRuntime["ensureThread"] =
        Effect.fn("CopilotAdapter.ensureThread")(function* (ensure) {
          if (ensure.modelSelection.instanceId !== input.instanceId)
            return yield* new ProviderAdapter.ProviderAdapterEnsureThreadError({
              driver: COPILOT_DRIVER,
              threadId: ensure.threadId,
              cause: new Error("Copilot model selection targets another account instance."),
            });
          if (providerThread) {
            if (
              ensure.existingProviderThread &&
              ensure.existingProviderThread.id !== providerThread.id
            ) {
              return yield* new ProviderAdapter.ProviderAdapterEnsureThreadError({
                driver: COPILOT_DRIVER,
                threadId: ensure.threadId,
                cause: new Error("Copilot runtime already owns another native thread."),
              });
            }
            return providerThread;
          }
          const previous = ensure.existingProviderThread;
          const nativeId = previous?.nativeThreadRef?.nativeId ?? open.initialNativeThreadId;
          const mcp = yield* mcpSessions.read(open.threadId);
          const sessionConfig: SessionConfig = {
            clientName: "t3-code",
            workingDirectory: cwd,
            configDirectory: config.effectiveHome,
            model: ensure.modelSelection.model,
            ...(reasoningEffort(ensure.modelSelection)
              ? { reasoningEffort: reasoningEffort(ensure.modelSelection)! }
              : {}),
            streaming: true,
            enableSkills: true,
            enableConfigDiscovery: input.settings.enableConfigDiscovery,
            skipCustomInstructions: !input.settings.enableConfigDiscovery,
            ...(mcp
              ? { systemMessage: { mode: "append", content: t3OrchestrationSystemPrompt(true)! } }
              : {}),
            includeSubAgentStreamingEvents: false,
            ...(mcp
              ? {
                  mcpServers: {
                    "t3-code": {
                      type: "http",
                      url: mcp.endpoint,
                      headers: { Authorization: mcp.authorizationHeader },
                    },
                  },
                }
              : {}),
            // Handle native IDs and applied-decision receipts through the permission RPC.
            onPermissionRequest: (request) => {
              if (!active || active.finished || stopped) {
                sdkOwnedPermissionRequests.add(request);
                return { kind: "user-not-available" };
              }
              return { kind: "no-result" };
            },
            onUserInputRequest: (request) =>
              new Promise((resolve) => {
                if (stopped) resolve({ answer: "", wasFreeform: true });
                else Queue.offerUnsafe(inbox, { type: "request", kind: "input", request, resolve });
              }),
            onExitPlanModeRequest: (request) =>
              new Promise((resolve) => {
                if (stopped) resolve({ approved: false });
                else Queue.offerUnsafe(inbox, { type: "request", kind: "plan", request, resolve });
              }),
            onEvent: (event) => {
              if (event.type === "session.resume" && event.data.alreadyInUse) alreadyInUse = true;
              if (!stopped) Queue.offerUnsafe(inbox, { type: "event", event });
            },
          };
          native = yield* sdk(
            nativeId ? "resume session" : "create session",
            () =>
              nativeId
                ? client.resumeSession(nativeId, { ...sessionConfig, continuePendingWork: false })
                : client.createSession(sessionConfig),
            30_000,
          );
          if (alreadyInUse) {
            yield* sdk("disconnect conflicting session", () => native!.disconnect()).pipe(
              Effect.ignore,
            );
            native = undefined;
            return yield* new ProviderAdapter.ProviderAdapterEnsureThreadError({
              driver: COPILOT_DRIVER,
              threadId: ensure.threadId,
              cause: new Error("Copilot session is already in use by another client."),
            });
          }
          const now = yield* DateTime.now;
          if (nativeId) {
            const transcript = yield* sdk("read native transcript", () => native!.getEvents()).pipe(
              Effect.result,
            );
            if (transcript._tag === "Success") {
              for (const event of transcript.success) {
                if (
                  event.agentId ||
                  (event.type !== "assistant.message" && event.type !== "user.message")
                )
                  continue;
                if (event.type === "assistant.message" && event.data.content.length === 0) continue;
                const messageId = MessageId.make(`${open.providerSessionId}:history:${event.id}`);
                messages.set(messageId, {
                  id: messageId,
                  createdBy: event.type === "user.message" ? "user" : "agent",
                  creationSource: "provider",
                  threadId: ensure.threadId,
                  runId: null,
                  nodeId: null,
                  role: event.type === "user.message" ? "user" : "assistant",
                  text: event.data.content,
                  attachments: [],
                  streaming: false,
                  createdAt: DateTime.makeUnsafe(event.timestamp),
                  updatedAt: DateTime.makeUnsafe(event.timestamp),
                });
              }
            }
          }
          const createdThread: OrchestrationV2ProviderThread = {
            id:
              previous?.id ??
              derive.providerThread({
                driver: COPILOT_DRIVER,
                nativeThreadId: native.sessionId,
                providerInstanceId: input.instanceId,
              }),
            driver: COPILOT_DRIVER,
            providerInstanceId: input.instanceId,
            providerSessionId: open.providerSessionId,
            appThreadId: ensure.threadId,
            ownerNodeId: null,
            nativeThreadRef: ref(native.sessionId),
            nativeConversationHeadRef: null,
            status: "idle",
            firstRunOrdinal: previous?.firstRunOrdinal ?? null,
            lastRunOrdinal: previous?.lastRunOrdinal ?? null,
            handoffIds: previous?.handoffIds ?? [],
            forkedFrom: previous?.forkedFrom ?? null,
            pendingBackgroundTasks: [],
            contextUsage: null,
            nativeMetadata: { modelSelection: ensure.modelSelection },
            goal: null,
            createdAt: previous?.createdAt ?? now,
            updatedAt: now,
          };
          providerThread = createdThread;
          yield* emit({
            type: "provider_thread.updated",
            driver: COPILOT_DRIVER,
            providerThread: createdThread,
          });
          const skills = yield* sdk("list skills", () => native!.rpc.skills.list()).pipe(
            Effect.result,
          );
          if (skills._tag === "Success")
            options.onSkills?.(cwd, skillsFromSdk(skills.success.skills as SkillsLoadedSkill[]));
          yield* drain();
          return createdThread;
        });
      const startTurn: ProviderAdapter.ProviderAdapterV2SessionRuntime["startTurn"] = Effect.fn(
        "CopilotAdapter.startTurn",
      )(function* (turnInput) {
        if (
          !native ||
          !providerThread ||
          stopped ||
          alreadyInUse ||
          turnInput.modelSelection.instanceId !== input.instanceId
        )
          return yield* new ProviderAdapter.ProviderAdapterTurnStartError({
            driver: COPILOT_DRIVER,
            providerThreadId: turnInput.providerThread.id,
            threadId: turnInput.threadId,
            runId: turnInput.runId,
          });
        if (active && !active.finished)
          return yield* new ProviderAdapter.ProviderAdapterProtocolError({
            driver: COPILOT_DRIVER,
            detail: "Previous Copilot turn is still active",
            reason: "previous_turn_active",
          });
        const effort = reasoningEffort(turnInput.modelSelection);
        yield* sdk("set model", () =>
          native!.setModel(
            turnInput.modelSelection.model,
            effort ? { reasoningEffort: effort } : {},
          ),
        );
        yield* sdk("set mode", () =>
          native!.rpc.mode.set({
            mode: turnInput.runtimePolicy.interactionMode === "plan" ? "plan" : "interactive",
          }),
        );
        yield* drain();
        const now = yield* DateTime.now;
        const providerTurn: OrchestrationV2ProviderTurn = {
          id: ProviderTurnId.make(
            `${providerThread.id}:${turnInput.attemptId}:${turnInput.providerTurnOrdinal}`,
          ),
          providerThreadId: providerThread.id,
          nodeId: turnInput.rootNodeId,
          runAttemptId: turnInput.attemptId,
          nativeTurnRef: null,
          ordinal: turnInput.providerTurnOrdinal,
          status: "running",
          startedAt: now,
          completedAt: null,
        };
        const turn: ActiveTurn = {
          input: turnInput,
          providerTurn,
          nextOrdinal: 1,
          items: new Map(),
          accepted: false,
          idle: false,
          interrupted: false,
          finished: false,
        };
        active = turn;
        lastTurn = turn;
        turns.set(providerTurn.id, providerTurn);
        yield* emit({
          type: "provider_turn.updated",
          driver: COPILOT_DRIVER,
          threadId: open.threadId,
          providerTurn,
        });
        yield* updateThread({
          status: "active",
          firstRunOrdinal: providerThread.firstRunOrdinal ?? turnInput.runOrdinal,
          lastRunOrdinal: turnInput.runOrdinal,
          nativeMetadata: { modelSelection: turnInput.modelSelection },
        });
        const userText = yield* providerMessageTextWithAttachmentPaths({
          text: turnInput.message.text,
          attachments: turnInput.message.attachments,
          resolveAttachmentPath: host.resolveAttachmentPath,
        });
        const instructions = buildRuntimeInstructions({
          harness: "GitHub Copilot",
          model: turnInput.modelSelection.model,
          reasoningEffort: effort,
        });
        const context = turnInput.appContext?.map((entry) => entry.text).join("\n\n") ?? "";
        const prompt = [instructions, history, context, userText].filter(Boolean).join("\n\n");
        const attachments: NonNullable<MessageOptions["attachments"]> = [];
        for (const attachment of turnInput.message.attachments) {
          const path = host.resolveAttachmentPath(attachment);
          if (!path)
            return yield* new ProviderAdapter.ProviderAdapterProtocolError({
              driver: COPILOT_DRIVER,
              detail: "Copilot attachment is unavailable",
              reason: "attachment_unreadable",
            });
          attachments.push({ type: "file" as const, path, displayName: attachment.name });
        }
        history = "";
        yield* sdk(
          "send",
          () =>
            native!.send({
              prompt,
              mode: "immediate",
              agentMode:
                turnInput.runtimePolicy.interactionMode === "plan" ? "plan" : "interactive",
              ...(attachments.length ? { attachments } : {}),
            }),
          30_000,
        ).pipe(
          Effect.tapError(() =>
            Effect.sync(() => {
              active = undefined;
            }),
          ),
        );
        turn.accepted = true;
        yield* Queue.offer(inbox, { type: "accepted" });
      });
      return {
        instanceId: input.instanceId,
        driver: COPILOT_DRIVER,
        providerSessionId: open.providerSessionId,
        providerSession,
        events: Stream.fromQueue(events),
        hasPendingBackgroundWork: Effect.sync(() =>
          [...tasks.values()].some((task) => task.status === "running" || task.status === "idle"),
        ),
        ensureThread,
        resumeThread: (resume) =>
          ensureThread({
            threadId: resume.threadId ?? open.threadId,
            existingProviderThread: resume.providerThread,
            modelSelection: resume.modelSelection ?? open.modelSelection,
            runtimePolicy: resume.runtimePolicy ?? open.runtimePolicy,
          }),
        injectHistory: (context) =>
          Effect.sync(() => {
            history = context.context;
            return true;
          }),
        startTurn,
        steerTurn: (steer) =>
          Effect.fail(
            new ProviderAdapter.ProviderAdapterSteerRunUnsupportedError({
              driver: COPILOT_DRIVER,
              providerThreadId: steer.providerThread.id,
            }),
          ),
        interruptTurn: Effect.fn("CopilotAdapter.interruptTurn")(function* () {
          if (!native || !active) return;
          active.interrupted = true;
          yield* sdk("abort", () => native!.abort());
        }),
        stopTask: ({ taskId }) =>
          sdk("cancel task", () => native!.rpc.tasks.cancel({ id: taskId })).pipe(Effect.asVoid),
        respondToRuntimeRequest: Effect.fn("CopilotAdapter.respondToRuntimeRequest")(
          function* (response) {
            const entry = pending.get(response.requestId);
            const permissionReplyKey = `${response.decision ?? ""}\n${response.feedback ?? ""}`;
            if (
              !entry &&
              confirmedPermissionReplies.get(response.requestId) === permissionReplyKey &&
              response.answers === undefined
            )
              return;
            if (!entry)
              return yield* new ProviderAdapter.ProviderAdapterRuntimeRequestResponseError({
                driver: COPILOT_DRIVER,
                requestId: response.requestId,
              });
            const answer = response.answers?.answer;
            const validAnswer =
              typeof answer === "string" ||
              (Array.isArray(answer) && answer.every((part) => typeof part === "string"));
            if (
              entry.request.kind === "user_input"
                ? !validAnswer
                : !["accept", "decline", "cancel"].includes(response.decision ?? "") ||
                  response.answers !== undefined
            ) {
              return yield* new ProviderAdapter.ProviderAdapterRuntimeRequestResponseError({
                driver: COPILOT_DRIVER,
                requestId: response.requestId,
                cause: new Error(
                  "Copilot requires a supported one-time decision or a text answer.",
                ),
              });
            }
            if (entry.responseOwnedByV2) {
              if (!entry.nativePermissionId || entry.permissionReplyKey !== permissionReplyKey) {
                return yield* new ProviderAdapter.ProviderAdapterRuntimeRequestResponseError({
                  driver: COPILOT_DRIVER,
                  requestId: response.requestId,
                });
              }
              if (entry.permissionReplyReceipt)
                return yield* Deferred.await(entry.permissionReplyReceipt);
            }
            // V2 already recorded the answer. Ownership must survive even a failed native receipt.
            entry.responseOwnedByV2 = true;
            const receipt = Deferred.makeUnsafe<void, ProviderAdapter.ProviderAdapterV2Error>();
            if (entry.nativePermissionId) {
              entry.permissionReplyKey = permissionReplyKey;
              entry.permissionReplyReceipt = receipt;
            }
            return yield* Effect.gen(function* () {
              const now = yield* DateTime.now;
              if (entry.nativePermissionId) {
                yield* decidePermission(
                  entry.nativePermissionId,
                  response.decision === "accept"
                    ? { kind: "approve-once" }
                    : {
                        kind: "reject",
                        ...(response.feedback ? { feedback: response.feedback } : {}),
                      },
                );
                confirmedPermissionReplies.set(response.requestId, permissionReplyKey);
              }
              pending.delete(response.requestId);
              entry.owner.items.set(response.requestId, {
                ...entry.item,
                status: "completed",
                completedAt: now,
                updatedAt: now,
              });
              // The decider owns resolution and delivery state; callback handoff is the last operation.
              if (!entry.nativePermissionId) entry.resolve(response);
            }).pipe(
              Effect.onExit((exit) => {
                delete entry.permissionReplyReceipt;
                return Deferred.done(receipt, exit);
              }),
            );
          },
        ),
        readThreadSnapshot: Effect.fn("CopilotAdapter.readThreadSnapshot")(function* () {
          yield* drain();
          if (!providerThread)
            return yield* new ProviderAdapter.ProviderAdapterProtocolError({
              driver: COPILOT_DRIVER,
              detail: "Copilot thread is not loaded",
            });
          return {
            providerThread,
            providerTurns: [...turns.values()],
            messages: [...messages.values()],
            runtimeRequests: [...pending.values()]
              .filter((entry) => !entry.responseOwnedByV2)
              .map((entry) => entry.request),
          };
        }),
        rollbackThread: (rollback) =>
          Effect.fail(
            new ProviderAdapter.ProviderAdapterRollbackThreadError({
              driver: COPILOT_DRIVER,
              providerThreadId: rollback.providerThread.id,
              cause: new Error("Native Copilot rollback is unsupported."),
            }),
          ),
        forkThread: (fork) =>
          Effect.fail(
            new ProviderAdapter.ProviderAdapterForkThreadError({
              driver: COPILOT_DRIVER,
              providerThreadId: fork.sourceProviderThread.id,
              cause: new Error("Native Copilot fork is unsupported."),
            }),
          ),
      } satisfies ProviderAdapter.ProviderAdapterV2SessionRuntime;
    }),
  });
});
