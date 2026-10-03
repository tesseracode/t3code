import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";
import * as NodeCrypto from "node:crypto";
import * as NodeChildProcess from "node:child_process";
import * as NodeUtil from "node:util";

const { values } = NodeUtil.parseArgs({ options: {
  directory: { type: "string" }, target: { type: "string" }, version: { type: "string" },
  "wsl-archive": { type: "string" },
} });
if (!values.directory || !values.target || !values.version) throw new Error("directory, target and version are required");
const base = "1af644681d931d77fdbda8a014d7c28fdd9ffdab";
const commit = NodeChildProcess.execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const versionFiles = ["apps/server/package.json", "apps/desktop/package.json", "apps/web/package.json", "packages/contracts/package.json"];
const changed = NodeChildProcess.execFileSync("git", ["diff", "--name-only", "HEAD"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
if (changed.some((file) => !versionFiles.includes(file))) throw new Error(`Unexpected build-time source changes: ${changed}`);
for (const file of versionFiles) {
  const before = JSON.parse(NodeChildProcess.execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8" }));
  const after = JSON.parse(await NodeFSP.readFile(file, "utf8"));
  if (after.version !== values.version) throw new Error(`Incorrect version in ${file}`);
  after.version = before.version;
  if (JSON.stringify(after) !== JSON.stringify(before)) throw new Error(`Non-version change in ${file}`);
}
async function identity(file) {
  const bytes = await NodeFSP.readFile(file);
  return { name: NodePath.basename(file), bytes: bytes.length, sha256: NodeCrypto.createHash("sha256").update(bytes).digest("hex") };
}
const directory = NodePath.resolve(values.directory);
const entries = await NodeFSP.readdir(directory, { withFileTypes: true });
const artifacts = await Promise.all(entries.filter((entry) => entry.isFile() && /\.(dmg|exe|zip|tar\.gz)$/.test(entry.name))
  .map((entry) => identity(NodePath.join(directory, entry.name))));
if (artifacts.length === 0) throw new Error("No native artifacts were produced");
const manifest = {
  schemaVersion: 1, productBase: base, buildCommit: commit, version: values.version, target: values.target,
  sourceOverlayPaths: NodeChildProcess.execFileSync("git", ["diff", "--name-only", base, "HEAD"], { encoding: "utf8" }).trim().split("\n").filter(Boolean),
  releaseTransform: { verified: true, files: versionFiles }, artifacts,
  wslRuntime: values["wsl-archive"] ? await identity(values["wsl-archive"]) : null,
  signing: "unsigned", publication: "build-artifacts-only", interactiveQualification: "pending",
};
await NodeFSP.writeFile(NodePath.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
await NodeFSP.writeFile(NodePath.join(directory, "SHA256SUMS"), artifacts.map((entry) => `${entry.sha256}  ${entry.name}\n`).join(""));
console.log(JSON.stringify({ target: manifest.target, buildCommit: commit, artifacts }, null, 2));
