import { assert, describe, it } from "@effect/vitest";
import type { MessageOptions, SessionConfig, SessionEvent } from "@github/copilot-sdk";
import {
  DEFAULT_SERVER_SETTINGS,
  MessageId,
  NodeId,
  ProjectId,
  ProviderInstanceId,
  ProviderSessionId,
  RunAttemptId,
  RunId,
  ThreadId,
  type OrchestrationV2AppThread,
} from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Queue from "effect/Queue";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as ProviderAdapter from "@t3tools/provider-core/server/ProviderAdapter";
import * as ProviderHost from "@t3tools/provider-core/server/ProviderHost";
import * as McpProviderSessions from "@t3tools/provider-core/server/McpProviderSessions";
import { CopilotSettings } from "../settings.ts";
import { makeAdapter, type ClientHandle, type SessionHandle } from "./adapter.ts";

const threadId = ThreadId.make("copilot-test");
const instanceId = ProviderInstanceId.make("githubCopilot");
const sessionId = ProviderSessionId.make("copilot-runtime");
const selection = { instanceId, model: "gpt-4.1", options: [] };
const policy: ProviderAdapter.ProviderAdapterV2RuntimePolicy = {
  cwd: "/workspace",
  runtimeMode: "approval-required",
  interactionMode: "default",
};
const settings = Schema.decodeSync(CopilotSettings)({});
const host = ProviderHost.ProviderHost.of({
  paths: {
    cwd: "/workspace",
    baseDir: "/test",
    stateDir: "/test/state",
    providerStatusCacheDir: "/test/cache",
    attachmentsDir: "/test/attachments",
  },
  settings: {
    get: Effect.succeed(DEFAULT_SERVER_SETTINGS),
    withSnapshot: (use) => use(DEFAULT_SERVER_SETTINGS),
    changes: Stream.empty,
    subscribe: Effect.succeed(Stream.empty),
  },
  shouldRunBackgroundWork: () => Effect.succeed(false),
  resolveAttachmentPath: (attachment) => `/test/attachments/${attachment.id}`,
  credentials: () =>
    Effect.succeed({
      binding: { owner: "t3", key: "test" },
      get: Effect.succeedNone,
      set: () => Effect.void,
      remove: Effect.void,
    }),
});

function fakeSdk() {
  let config: SessionConfig | undefined;
  let serial = 0;
  let disconnected = 0;
  let stopped = 0;
  let resumed: string | undefined;
  let conflict = false;
  let continuePendingWork: boolean | undefined;
  let background: Awaited<ReturnType<SessionHandle["rpc"]["tasks"]["list"]>> = { tasks: [] };
  const sent: MessageOptions[] = [];
  const emit = (type: SessionEvent["type"], data: unknown = {}, agentId?: string) => {
    config?.onEvent?.({
      type,
      data,
      id: `native-event-${++serial}`,
      timestamp: "2026-10-29T00:00:00Z",
      parentId: null,
      ...(agentId ? { agentId } : {}),
    } as SessionEvent);
  };
  const session: SessionHandle = {
    sessionId: "native-copilot",
    send: async (message) => {
      sent.push(typeof message === "string" ? { prompt: message } : message);
      return "native-user-message";
    },
    abort: async () => {
      emit("session.idle");
    },
    disconnect: async () => {
      disconnected++;
    },
    getEvents: async () => [],
    setModel: async () => {},
    rpc: {
      mode: { set: async () => {} },
      plan: {
        read: async () => ({
          exists: true,
          content: "# Plan\n\nImplement safely",
          path: "/copilot/plan.md",
        }),
      },
      skills: { list: async () => ({ skills: [] }) },
      tasks: { list: async () => background, cancel: async () => ({ cancelled: true }) },
    },
  };
  const client: ClientHandle = {
    start: async () => {},
    stop: async () => {
      stopped++;
      return [];
    },
    forceStop: async () => {},
    createSession: async (created) => {
      config = created;
      emit("session.idle");
      return session;
    },
    resumeSession: async (id, created) => {
      resumed = id;
      continuePendingWork = created.continuePendingWork;
      config = created;
      emit("session.resume", { alreadyInUse: conflict });
      return session;
    },
  };
  return {
    client,
    session,
    sent,
    emit,
    get config() {
      return config!;
    },
    get resumed() {
      return resumed;
    },
    get continuePendingWork() {
      return continuePendingWork;
    },
    get disconnected() {
      return disconnected;
    },
    get stopped() {
      return stopped;
    },
    conflict: () => {
      conflict = true;
    },
    setTasks: (tasks: typeof background) => {
      background = tasks;
    },
  };
}
type Fake = ReturnType<typeof fakeSdk>;

function promiseGate() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const setup = Effect.fnUntraced(function* (fake: Fake, initialNativeThreadId?: string) {
  const adapter = yield* makeAdapter(
    { instanceId, settings, environment: { HOME: "/test-account" } },
    { clientFactory: () => fake.client },
  );
  const runtime = yield* adapter.openSession({
    threadId,
    providerSessionId: sessionId,
    modelSelection: selection,
    runtimePolicy: policy,
    ...(initialNativeThreadId ? { initialNativeThreadId } : {}),
  });
  const emitted: ProviderAdapter.ProviderAdapterV2Event[] = [];
  const eventQueue = yield* Queue.unbounded<ProviderAdapter.ProviderAdapterV2Event>();
  yield* runtime.events.pipe(
    Stream.runForEach((event) =>
      Effect.sync(() => {
        emitted.push(event);
      }).pipe(Effect.andThen(Queue.offer(eventQueue, event))),
    ),
    Effect.forkScoped,
  );
  const takeEvent = Effect.fnUntraced(function* (
    predicate: (event: ProviderAdapter.ProviderAdapterV2Event) => boolean,
  ) {
    while (true) {
      const event = yield* Queue.take(eventQueue);
      if (predicate(event)) return event;
    }
  });
  const thread = yield* runtime.ensureThread({
    threadId,
    modelSelection: selection,
    runtimePolicy: policy,
  });
  const start = Effect.fnUntraced(function* (ordinal = 1) {
    const now = yield* DateTime.now;
    const appThread: OrchestrationV2AppThread = {
      id: threadId,
      projectId: ProjectId.make("project"),
      title: "Test",
      providerInstanceId: instanceId,
      modelSelection: selection,
      runtimeMode: policy.runtimeMode,
      interactionMode: "default",
      branch: null,
      worktreePath: null,
      activeProviderThreadId: thread.id,
      lineage: { parentThreadId: null, relationshipToParent: null, rootThreadId: threadId },
      forkedFrom: null,
      createdBy: "user",
      creationSource: "web",
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      settledOverride: null,
      settledAt: null,
      lastVisitedAt: null,
      deletedAt: null,
    };
    yield* runtime.startTurn({
      appThread,
      threadId,
      runId: RunId.make(`run-${ordinal}`),
      runOrdinal: ordinal,
      providerTurnOrdinal: ordinal,
      attemptId: RunAttemptId.make(`attempt-${ordinal}`),
      rootNodeId: NodeId.make(`root-${ordinal}`),
      providerThread: thread,
      message: {
        messageId: MessageId.make(`user-${ordinal}`),
        text: "Hello",
        attachments: [],
        createdBy: "user",
        creationSource: "web",
      },
      modelSelection: selection,
      runtimePolicy: policy,
    });
  });
  const drain = () => runtime.readThreadSnapshot({ providerThread: thread });
  return { runtime, thread, emitted, start, drain, takeEvent };
});

const provide = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.provideService(ProviderHost.ProviderHost, host),
    Effect.provide(McpProviderSessions.layer),
    Effect.scoped,
  );

describe("native Copilot V2", () => {
  it.effect(
    "completes exactly once on root session.idle, never assistant or child boundaries",
    () =>
      provide(
        Effect.gen(function* () {
          const fake = fakeSdk();
          const { runtime, start, drain } = yield* setup(fake);
          yield* start();
          fake.emit("assistant.message_delta", { messageId: "reply", deltaContent: "Hello" });
          fake.emit("assistant.turn_end", { turnId: "model-step" });
          fake.emit("assistant.idle");
          fake.emit("session.idle", {}, "child");
          fake.emit("assistant.message", { messageId: "child", content: "Child only" }, "child");
          let snapshot = yield* drain();
          assert.equal(snapshot.providerTurns[0]?.status, "running");
          assert.equal(snapshot.messages[0]?.text, "Hello");
          assert.equal(snapshot.messages.length, 1);
          const overlap = yield* start(2).pipe(Effect.exit);
          assert.isTrue(Exit.isFailure(overlap));
          fake.emit("assistant.message", { messageId: "reply", content: "Hello world" });
          fake.emit("session.idle");
          fake.emit("session.idle");
          snapshot = yield* drain();
          assert.equal(snapshot.providerTurns[0]?.status, "completed");
          assert.equal(snapshot.messages[0]?.text, "Hello world");
          assert.isFalse(snapshot.messages[0]!.streaming);
          yield* start(2);
          fake.emit("session.idle");
          snapshot = yield* runtime.readThreadSnapshot({ providerThread: snapshot.providerThread });
          assert.deepEqual(
            snapshot.providerTurns.map((turn) => turn.status),
            ["completed", "completed"],
          );
        }),
      ),
  );

  it.effect("refuses an already-owned native resume without aborting or sending", () =>
    provide(
      Effect.gen(function* () {
        const fake = fakeSdk();
        fake.conflict();
        const opened = yield* setup(fake, "durable-session").pipe(Effect.exit);
        assert.isTrue(Exit.isFailure(opened));
        assert.equal(fake.resumed, "durable-session");
        assert.equal(fake.disconnected, 1);
        assert.equal(fake.sent.length, 0);
        assert.isFalse(fake.continuePendingWork ?? true);
      }),
    ),
  );

  it.effect(
    "waits for native send admission even when the root becomes idle before send resolves",
    () =>
      provide(
        Effect.gen(function* () {
          const fake = fakeSdk();
          const started = promiseGate();
          const admitted = promiseGate();
          fake.session.send = async () => {
            started.resolve();
            await admitted.promise;
            return "message";
          };
          const { start, drain } = yield* setup(fake);
          const sending = yield* Effect.forkChild(start());
          yield* Effect.promise(() => started.promise);
          fake.emit("session.idle");
          assert.equal((yield* drain()).providerTurns[0]?.status, "running");
          admitted.resolve();
          yield* Fiber.join(sending);
          assert.equal((yield* drain()).providerTurns[0]?.status, "completed");
        }),
      ),
  );

  it.effect(
    "resumes the same native identity after restart and emits an interrupted rather than successful turn",
    () =>
      provide(
        Effect.gen(function* () {
          const fake = fakeSdk();
          const { runtime, start, drain, thread } = yield* setup(fake, "native-copilot");
          assert.equal(thread.nativeThreadRef?.nativeId, "native-copilot");
          assert.equal(fake.resumed, "native-copilot");
          yield* start();
          const snapshot = yield* drain();
          yield* runtime.interruptTurn({
            providerThread: thread,
            providerTurnId: snapshot.providerTurns[0]!.id,
          });
          assert.equal((yield* drain()).providerTurns[0]?.status, "interrupted");
        }),
      ),
  );

  it.effect("bridges permission and user-input callbacks as live V2 requests", () =>
    provide(
      Effect.gen(function* () {
        const fake = fakeSdk();
        const { runtime, start, drain } = yield* setup(fake);
        yield* start();
        const permission = fake.config.onPermissionRequest!(
          { kind: "read", path: "/workspace/data", intention: "Read input" },
          { sessionId: "native-copilot" },
        );
        const pendingPermission = (yield* drain()).runtimeRequests[0]!;
        assert.equal(pendingPermission.kind, "file-read");
        const unsupported = yield* runtime
          .respondToRuntimeRequest({
            requestId: pendingPermission.id,
            decision: "acceptForSession",
          })
          .pipe(Effect.exit);
        assert.isTrue(Exit.isFailure(unsupported));
        yield* runtime.respondToRuntimeRequest({
          requestId: pendingPermission.id,
          decision: "accept",
        });
        assert.deepEqual(yield* Effect.promise(() => Promise.resolve(permission)), {
          kind: "approve-once",
        });
        const question = fake.config.onUserInputRequest!(
          { question: "Which?", choices: ["A", "B"] },
          { sessionId: "native-copilot" },
        );
        const pendingQuestion = (yield* drain()).runtimeRequests.find(
          (request) => request.status === "pending",
        )!;
        yield* runtime.respondToRuntimeRequest({
          requestId: pendingQuestion.id,
          answers: { answer: "B" },
        });
        assert.deepEqual(yield* Effect.promise(() => Promise.resolve(question)), {
          answer: "B",
          wasFreeform: false,
        });
        fake.emit("session.idle");
        yield* drain();
      }),
    ),
  );

  it.effect(
    "publishes native plans and automatic compaction without treating either as user-turn completion",
    () =>
      provide(
        Effect.gen(function* () {
          const fake = fakeSdk();
          const { runtime, start, drain, takeEvent } = yield* setup(fake);
          yield* start();
          const approval = fake.config.onExitPlanModeRequest!(
            {
              summary: "Implement safely",
              planContent: "# Plan",
              actions: ["continue"],
              recommendedAction: "continue",
            },
            { sessionId: "native-copilot" },
          );
          const request = (yield* drain()).runtimeRequests.find(
            (entry) => entry.status === "pending",
          )!;
          const plan = yield* takeEvent((event) => event.type === "plan.updated");
          assert.equal(plan.type === "plan.updated" ? plan.plan.kind : null, "proposed_plan");
          yield* runtime.respondToRuntimeRequest({
            requestId: request.id,
            answers: { answer: "Approve" },
          });
          assert.deepEqual(yield* Effect.promise(() => Promise.resolve(approval)), {
            approved: true,
            selectedAction: "continue",
          });
          fake.emit("session.compaction_start", {});
          fake.emit("session.compaction_complete", {
            success: true,
            summaryContent: "Compacted context",
          });
          const compacted = yield* takeEvent(
            (event) =>
              event.type === "turn_item.updated" &&
              event.turnItem.type === "compaction" &&
              event.turnItem.status === "completed",
          );
          assert.equal(
            compacted.type === "turn_item.updated" && compacted.turnItem.type === "compaction"
              ? compacted.turnItem.summary
              : null,
            "Compacted context",
          );
          assert.equal((yield* drain()).providerTurns[0]?.status, "running");
          fake.emit("session.idle");
          assert.equal((yield* drain()).providerTurns[0]?.status, "completed");
        }),
      ),
  );

  it.effect(
    "retains background task state after root idle without letting child idle finish the root",
    () =>
      provide(
        Effect.gen(function* () {
          const fake = fakeSdk();
          const { runtime, start, drain, takeEvent } = yield* setup(fake);
          yield* start();
          const task = {
            id: "bg-task",
            type: "agent" as const,
            status: "running" as const,
            agentType: "explore",
            description: "Inspect code",
            prompt: "Inspect",
            startedAt: "2026-10-29T00:00:00Z",
            toolCallId: "task-tool",
          };
          fake.setTasks({ tasks: [task] });
          fake.emit("session.background_tasks_changed");
          fake.emit("session.idle");
          const snapshot = yield* drain();
          assert.equal(snapshot.providerTurns[0]?.status, "completed");
          assert.equal(snapshot.providerThread.pendingBackgroundTasks?.[0]?.taskId, "bg-task");
          assert.isTrue(yield* runtime.hasPendingBackgroundWork!);
          const running = yield* takeEvent(
            (event) => event.type === "subagent.updated" && event.subagent.status === "running",
          );
          assert.equal(
            running.type === "subagent.updated" ? running.subagent.runId : null,
            "run-1",
          );
          yield* start(2);
          fake.setTasks({ tasks: [{ ...task, status: "completed", result: "Finished" }] });
          fake.emit("assistant.idle", {}, "bg-task");
          const completed = yield* takeEvent(
            (event) => event.type === "subagent.updated" && event.subagent.status === "completed",
          );
          assert.equal(
            completed.type === "subagent.updated" ? completed.subagent.runId : null,
            "run-1",
          );
          assert.equal((yield* drain()).providerTurns[1]?.status, "running");
          fake.setTasks({ tasks: [] });
          fake.emit("session.background_tasks_changed");
          yield* drain();
          assert.isFalse(yield* runtime.hasPendingBackgroundWork!);
          fake.emit("session.idle");
          yield* drain();
        }),
      ),
  );

  it.effect("projects native commands, file edits and redacted MCP arguments into V2 tools", () =>
    provide(
      Effect.gen(function* () {
        const fake = fakeSdk();
        const { start, drain, takeEvent } = yield* setup(fake);
        yield* start();
        fake.emit("tool.execution_start", {
          toolCallId: "shell",
          toolName: "bash",
          arguments: { command: "git status" },
        });
        fake.emit("tool.execution_partial_result", {
          toolCallId: "shell",
          partialOutput: "clean\n",
        });
        const delta = yield* takeEvent((event) => event.type === "command_output.delta");
        assert.equal(delta.type === "command_output.delta" ? delta.chunk : null, "clean\n");
        fake.emit("tool.execution_complete", {
          toolCallId: "shell",
          success: true,
          result: { content: "clean\n" },
        });
        const shell = yield* takeEvent(
          (event) =>
            event.type === "turn_item.updated" &&
            event.turnItem.type === "command_execution" &&
            event.turnItem.status === "completed",
        );
        assert.equal(
          shell.type === "turn_item.updated" && shell.turnItem.type === "command_execution"
            ? shell.turnItem.output
            : null,
          "clean\n",
        );
        fake.emit("tool.execution_start", {
          toolCallId: "edit",
          toolName: "edit",
          arguments: { path: "src/app.ts", old_str: "old", new_str: "new" },
        });
        const edit = yield* takeEvent(
          (event) => event.type === "turn_item.updated" && event.turnItem.type === "file_change",
        );
        assert.equal(
          edit.type === "turn_item.updated" && edit.turnItem.type === "file_change"
            ? edit.turnItem.fileName
            : null,
          "src/app.ts",
        );
        fake.emit("tool.execution_start", {
          toolCallId: "mcp",
          toolName: "lookup",
          mcpServerName: "docs",
          arguments: { token: "do-not-persist", query: "safe" },
        });
        const mcp = yield* takeEvent(
          (event) => event.type === "turn_item.updated" && event.turnItem.type === "dynamic_tool",
        );
        const input =
          mcp.type === "turn_item.updated" && mcp.turnItem.type === "dynamic_tool"
            ? String(mcp.turnItem.input)
            : "";
        assert.include(input, "[redacted]");
        assert.notInclude(input, "do-not-persist");
        fake.emit("session.idle");
        yield* drain();
      }),
    ),
  );

  it.effect("treats native shutdown as interruption and refuses subsequent sends", () =>
    provide(
      Effect.gen(function* () {
        const fake = fakeSdk();
        const { start, drain } = yield* setup(fake);
        yield* start();
        fake.emit("session.shutdown", { shutdownType: "routine" });
        assert.equal((yield* drain()).providerTurns[0]?.status, "interrupted");
        assert.isTrue(Exit.isFailure(yield* start(2).pipe(Effect.exit)));
      }),
    ),
  );
});
