import * as NodeOS from "node:os";
import * as NodeAssert from "node:assert/strict";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeChildProcess from "node:child_process";
import * as NodeEvents from "node:events";
import * as NodeTimersPromises from "node:timers/promises";
// oxlint-disable-next-line t3code/no-global-process-runtime -- Standalone probe captures the actual packaged host without workspace/Effect dependencies.
const runtime = { platform: NodeOS.platform(), architecture: NodeOS.arch() };
if (runtime.platform !== "linux" || !["arm64", "x64"].includes(runtime.architecture)) {
  throw new Error("The WSL helper probe requires Linux arm64 or x64");
}
const [archive, sha, installer, evidencePath] = process.argv.slice(2);
if (!archive || !sha || !installer || !evidencePath)
  throw new Error("archive, SHA, generated installer and evidence path required");
const script = NodePath.join(import.meta.dirname, "wsl-runtime-smoke.sh");
const runId = `harness-${process.pid}`;
const port = "48971";
const run = (action, ...args) =>
  NodeChildProcess.execFileSync("bash", [script, action, runId, port, ...args], {
    encoding: "utf8",
  });
const metadata = () =>
  Object.fromEntries(
    run("metadata")
      .trim()
      .split("\n")
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
let child;
const start = async () => {
  child = NodeChildProcess.spawn("bash", [script, "serve", runId, port], {
    stdio: ["ignore", "ignore", "inherit"],
  });
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("Foreground WSL harness backend exited early");
    try {
      if (
        (await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(2000) })).status ===
        200
      )
        return metadata();
    } catch (error) {
      if (!(error instanceof TypeError) && error?.name !== "TimeoutError") throw error;
    }
    await NodeTimersPromises.setTimeout(250);
  }
  throw new Error("Foreground WSL harness backend did not become ready");
};
const stop = async () => {
  if (!child || child.exitCode !== null) return;
  const exited = NodeEvents.once(child, "exit");
  run("stop");
  await exited;
  child = undefined;
};
try {
  run("prepare", archive, sha, installer);
  const first = await start();
  NodeAssert.equal(first.serverVersion, "t3 v0.0.42");
  for (const key of ["copilotMode", "rgMode", "tgrepMode"]) NodeAssert.equal(first[key], "755");
  await stop();
  const second = await start();
  NodeAssert.equal(second.environmentId, first.environmentId);
  await stop();
  const arch = runtime.architecture;
  const executable = NodePath.join(
    first.runtimeRoot,
    `node_modules/@github/copilot-linux-${arch}/copilot`,
  );
  NodeFS.chmodSync(executable, 0o644);
  run("prepare", archive, sha, installer);
  NodeAssert.equal(NodeFS.statSync(executable).mode & 0o777, 0o755);
  NodeFS.rmSync(NodePath.join(first.runtimeRoot, "node_modules/@github"), { recursive: true });
  run("prepare", archive, sha, installer);
  NodeAssert.equal(NodeFS.statSync(executable).mode & 0o777, 0o755);
  NodeFS.writeFileSync(
    evidencePath,
    JSON.stringify(
      {
        platform: runtime.platform,
        architecture: runtime.architecture,
        scope: "Linux execution of WSL helper, not Windows transport",
        version: first.serverVersion,
        restartIdentityPreserved: true,
        executableModes: "755",
        damagedModeRepaired: true,
        entireCopilotSubtreeRepaired: true,
        foregroundProcessStopped: true,
      },
      null,
      2,
    ),
  );
  console.log(
    "Real release archive: foreground lifecycle, restart identity, modes and both warm-cache repairs passed.",
  );
} finally {
  await stop();
}
