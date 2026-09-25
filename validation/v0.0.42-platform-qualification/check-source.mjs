import * as NodeAssert from "node:assert/strict";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeChildProcess from "node:child_process";
const [root, commit, version] = process.argv.slice(2);
if (!root || !commit || !version)
  throw new Error("source root, frozen commit and release version required");
const git = (...args) =>
  NodeChildProcess.execFileSync("git", args, { cwd: root, encoding: "utf8" });
NodeAssert.equal(git("rev-parse", "HEAD").trim(), commit);
const manifests = [
  "apps/server/package.json",
  "apps/desktop/package.json",
  "apps/web/package.json",
  "packages/contracts/package.json",
];
const changed = git("diff", "--name-only", commit).trim().split("\n").filter(Boolean);
NodeAssert.ok(
  changed.every((file) => manifests.includes(file)),
  `Unexpected product changes: ${changed.join(", ")}`,
);
NodeAssert.equal(
  git("ls-files", "--others", "--exclude-standard").trim(),
  "",
  "Unexpected untracked source files",
);
for (const file of manifests) {
  const original = JSON.parse(git("show", `${commit}:${file}`));
  const actual = JSON.parse(NodeFS.readFileSync(NodePath.join(root, file), "utf8"));
  NodeAssert.deepEqual(actual, { ...original, version }, file);
}
console.log("Frozen source preserved; only the four standard release-version fields differ.");
