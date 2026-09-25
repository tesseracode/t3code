import * as NodeAssert from "node:assert/strict";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeNet from "node:net";
import * as NodeChildProcess from "node:child_process";
import * as NodeEvents from "node:events";
import * as NodeTimersPromises from "node:timers/promises";

const [executable, entry, evidencePath] = process.argv.slice(2);
if (!executable || !entry || !evidencePath)
  throw new Error("executable, entry (or - for SEA), and evidence path required");
const root = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3-packaged-backend-"));
const state = NodePath.join(root, "state");
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !/^(T3CODE_|COPILOT_|VITE_|ELECTRON_RUN_AS_NODE$)/.test(key),
  ),
);
Object.assign(env, {
  HOME: root,
  USERPROFILE: root,
  T3CODE_HOME: state,
  COPILOT_HOME: NodePath.join(root, "copilot"),
});
if (entry !== "-") env.ELECTRON_RUN_AS_NODE = "1";
const availablePort = () =>
  new Promise((resolve, reject) => {
    const server = NodeNet.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
let child;
let output = "";
const stop = async () => {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = NodeEvents.once(child, "exit");
  child.kill("SIGTERM");
  let timer;
  try {
    await Promise.race([
      exited,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Owned backend did not exit within 15 seconds")),
          15000,
        );
      }),
    ]);
  } catch (error) {
    child.kill("SIGKILL");
    await exited;
    throw error;
  } finally {
    clearTimeout(timer);
  }
};
const evidence = { version: null, first: null, restarted: null, migrations: null, error: null };
try {
  const prefix = entry === "-" ? [] : [entry];
  evidence.version = NodeChildProcess.execFileSync(executable, [...prefix, "--version"], {
    env,
    encoding: "utf8",
  }).trim();
  NodeAssert.equal(evidence.version, "t3 v0.0.42");
  for (const stage of ["first", "restarted"]) {
    const port = await availablePort();
    output = "";
    child = NodeChildProcess.spawn(
      executable,
      [
        ...prefix,
        "serve",
        "--mode",
        "desktop",
        "--base-dir",
        state,
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
        "--no-browser",
      ],
      {
        cwd: root,
        env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    child.stdout.on("data", (chunk) => {
      output = (output + chunk).slice(-20000);
    });
    child.stderr.on("data", (chunk) => {
      output = (output + chunk).slice(-20000);
    });
    let spawnError;
    child.once("error", (error) => {
      spawnError = error;
    });
    const deadline = Date.now() + 45000;
    let ready = false;
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null || child.signalCode !== null)
        throw new Error("Packaged backend exited before readiness");
      try {
        ready =
          (await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(2000) }))
            .status === 200;
      } catch (error) {
        if (!(error instanceof TypeError) && error?.name !== "TimeoutError") throw error;
      }
      if (ready) break;
      await NodeTimersPromises.setTimeout(250);
    }
    NodeAssert.ok(ready, "Packaged backend never returned HTTP 200");
    const environmentId = NodeFS.readFileSync(
      NodePath.join(state, "userdata/environment-id"),
      "utf8",
    ).trim();
    evidence[stage] = { httpStatus: 200, environmentId };
    await stop();
  }
  NodeAssert.equal(evidence.first.environmentId, evidence.restarted.environmentId);
  evidence.migrations = JSON.parse(
    NodeChildProcess.execFileSync(
      process.execPath,
      [
        NodePath.join(import.meta.dirname, "migration-probe.cjs"),
        NodePath.join(state, "userdata/state.sqlite"),
      ],
      { encoding: "utf8" },
    ),
  );
} catch (error) {
  evidence.error = {
    message: error.message,
    output: output
      .replace(/([?#&]token=)[^\s&#]+/gi, "$1[REDACTED]")
      .replace(/^(Token:\s*)\S+/gim, "$1[REDACTED]")
      .replace(/^[^\r\n]*[\u2580\u2584\u2588][^\r\n]*/gm, "[QR REDACTED]"),
  };
  throw error;
} finally {
  try {
    await stop();
  } finally {
    NodeFS.mkdirSync(NodePath.dirname(evidencePath), { recursive: true });
    NodeFS.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
    NodeFS.rmSync(root, { recursive: true, force: true });
  }
}
console.log(
  "Packaged backend version, HTTP, identity persistence and both migration ledgers passed.",
);
