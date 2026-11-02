import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";

const { values } = parseArgs({
  options: {
    "module-root": { type: "string" },
    runtime: { type: "string" },
  },
});
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const require = createRequire(
  values["module-root"]
    ? join(resolve(values["module-root"]), "__qualification__.cjs")
    : join(root, "packages/provider-copilot/package.json"),
);
const { CopilotClient, RuntimeConnection } = require("@github/copilot-sdk");
const home = await mkdtemp(join(tmpdir(), "t3-sdk-qualification-"));
const sessionId = `t3-qualification-${randomUUID()}`;
let requests = 0;
let fixtureMode = "text";
let toolIssued = false;
let permissionRequests = 0;
let inputRequests = 0;
const permissionReceipt = Promise.withResolvers();
const cancellationRequest = Promise.withResolvers();
const fixtureFailure = Promise.withResolvers();

async function bounded(promise, label) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} exceeded 30 seconds`)), 30_000);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

const fixture = createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    fixtureFailure.reject(error);
    response.destroy();
  });
});
async function handleRequest(request, response) {
  const body = [];
  for await (const chunk of request) body.push(chunk);
  const input = JSON.parse(Buffer.concat(body).toString());
  requests++;
  if (fixtureMode === "cancel") {
    cancellationRequest.resolve();
    return;
  }
  let message = { role: "assistant", content: "Local native qualification fixture." };
  let finish = "stop";
  if ((fixtureMode === "permission" || fixtureMode === "input") && !toolIssued) {
    const shell = process.platform === "win32" ? "powershell" : "bash";
    const tool = input.tools.find((entry) =>
      entry.function.name === (fixtureMode === "permission" ? shell : "ask_user"),
    );
    if (!tool) throw new Error(`Native ${fixtureMode} tool is unavailable`);
    toolIssued = true;
    message = {
      role: "assistant",
      content: null,
      tool_calls: [{
        id: "native-permission-fixture",
        type: "function",
        function: {
          name: tool.function.name,
          arguments: JSON.stringify(fixtureMode === "permission"
            ? {
                command: process.platform === "win32"
                  ? "Write-Output 't3-native-permission-fixture'"
                  : "printf t3-native-permission-fixture",
                description: "Print an inert qualification marker",
                initial_wait: 1000,
              }
            : {
                question: "Choose a local qualification answer.",
                choices: ["local qualification answer", "unused answer"],
                allowFreeform: true,
              }),
        },
      }],
    };
    finish = "tool_calls";
  }
  if (!input.stream) {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({
      id: `fixture-${requests}`,
      object: "chat.completion",
      created: 1,
      model: "fixture-model",
      choices: [{ index: 0, message, finish_reason: finish }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }));
    return;
  }
  response.writeHead(200, { "content-type": "text/event-stream" });
  const chunk = (delta, finish_reason = null) =>
    response.write(`data: ${JSON.stringify({
      id: `fixture-${requests}`,
      object: "chat.completion.chunk",
      created: 1,
      model: "fixture-model",
      choices: [{ index: 0, delta, finish_reason }],
    })}\n\n`);
  chunk({ role: "assistant", content: "Local native qualification fixture." });
  chunk({}, "stop");
  response.end("data: [DONE]\n\n");
}
fixture.listen(0, "127.0.0.1");
await once(fixture, "listening");
const address = fixture.address();
if (!address || typeof address === "string") throw new Error("Missing fixture address");
const provider = {
  type: "openai",
  baseUrl: `http://127.0.0.1:${address.port}/v1`,
  apiKey: "local-fixture-not-a-credential",
  wireApi: "completions",
};
let session;
const sessionConfig = {
  provider,
  onPermissionRequest: () => {
    permissionRequests++;
    return { kind: "no-result" };
  },
  onEvent: (event) => {
    if (event.type === "permission.requested") {
      session.rpc.permissions.handlePendingPermissionRequest({
        requestId: event.data.requestId,
        result: { kind: "approve-once" },
      }).then(permissionReceipt.resolve, permissionReceipt.reject);
    }
  },
  onUserInputRequest: () => {
    inputRequests++;
    return { answer: "local qualification answer", wasFreeform: true };
  },
};
// Use only OS launch essentials, not inherited account tokens, profiles or SDK overrides.
const env = Object.fromEntries(
  ["PATH", "SystemRoot", "WINDIR", "ComSpec", "PATHEXT"]
    .filter((key) => process.env[key] !== undefined)
    .map((key) => [key, process.env[key]]),
);
Object.assign(env, {
  HOME: home,
  USERPROFILE: home,
  COPILOT_HOME: home,
  TMPDIR: home,
  TEMP: home,
  TMP: home,
  LOCALAPPDATA: home,
  APPDATA: home,
});
const client = new CopilotClient({
  connection: RuntimeConnection.forStdio(values.runtime ? { path: resolve(values.runtime) } : {}),
  useLoggedInUser: false,
  baseDirectory: home,
  workingDirectory: home,
  env,
  logLevel: "error",
});
let step = "startup";
try {
  await Promise.race([qualify(), fixtureFailure.promise]);
} catch (error) {
  console.error(JSON.stringify({ step, result: "unqualified", error: String(error) }));
  process.exitCode = 1;
} finally {
  try {
    if (session) await bounded(session.disconnect(), "disconnect");
    const errors = await bounded(client.stop(), "stop");
    if (errors.length) throw new AggregateError(errors, "SDK stop failed");
  } finally {
    await client.forceStop();
    fixture.closeAllConnections();
    await new Promise((resolveClose, reject) => fixture.close((error) => error ? reject(error) : resolveClose()));
    await rm(home, { recursive: true, force: true });
  }
}

async function qualify() {
  await bounded(client.start(), step);
  const status = await client.getStatus();
  if (status.version !== "1.0.105" || status.protocolVersion !== 3)
    throw new Error("Unexpected native runtime/protocol; this script qualifies SDK 1.0.28");
  console.log(JSON.stringify({ step, platform: process.platform, arch: process.arch, node: process.version, status }));
  step = "create-no-inference";
  session = await client.createSession({ sessionId, model: "fixture-model", ...sessionConfig });
  console.log(JSON.stringify({ step, result: "created" }));
  step = "local-fixture-turn";
  await session.sendAndWait({ prompt: "Respond using the local fixture only." }, 30_000);
  console.log(JSON.stringify({ step, requests }));
  step = "save-and-cold-resume";
  await client.rpc.sessions.save({ sessionId });
  await session.disconnect();
  session = undefined;
  const stopErrors = await bounded(client.stop(), "cold-stop");
  if (stopErrors.length) throw new AggregateError(stopErrors);
  await bounded(client.start(), "cold-start");
  session = await client.resumeSession(sessionId, { ...sessionConfig, continuePendingWork: false });
  if (!(await session.getEvents()).some((event) => event.type === "assistant.message"))
    throw new Error("Transcript missing after cold resume");
  console.log(JSON.stringify({ step, transcriptRetained: true }));
  step = "native-permission";
  fixtureMode = "permission";
  await session.sendAndWait({ prompt: "Run the local inert qualification marker." }, 30_000);
  if (permissionRequests !== 1) throw new Error(`Expected one permission callback; received ${permissionRequests}`);
  const receipt = await bounded(permissionReceipt.promise, "permission receipt");
  if (!receipt.success) throw new Error("Native permission decision did not apply");
  if (!(await session.getEvents()).some((event) => event.type === "tool.execution_complete" && event.data.success))
    throw new Error("Tool completion missing");
  console.log(JSON.stringify({ step, permissionRequests, toolCompleted: true }));
  step = "native-user-input";
  fixtureMode = "input";
  toolIssued = false;
  await session.sendAndWait({ prompt: "Ask for the local qualification answer." }, 30_000);
  if (inputRequests !== 1) throw new Error(`Expected one input callback; received ${inputRequests}`);
  console.log(JSON.stringify({ step, inputRequests }));
  step = "cancel-active-inference";
  fixtureMode = "cancel";
  await session.send({ prompt: "Wait for local fixture cancellation." });
  await bounded(cancellationRequest.promise, "inference receipt");
  await session.abort();
  console.log(JSON.stringify({ step, result: "acknowledged during loopback inference" }));
  console.log(JSON.stringify({ result: "passed", scope: "offline-native-sdk-only", packagedApplicationQualified: false, authenticatedFusionQualified: false }));
}
