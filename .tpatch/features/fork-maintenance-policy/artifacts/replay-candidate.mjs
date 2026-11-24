import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const [baseRef, targetRef, ...selected] = process.argv.slice(2);
if (!baseRef || !targetRef || selected.length === 0) {
  throw new Error("Usage: node replay-candidate.mjs <base> <target> <root>...");
}
if (selected.some((slug) => !/^[a-z0-9-]+$/.test(slug))) {
  throw new Error("Invalid feature slug");
}

const git = (args, env = process.env) =>
  execFileSync("git", args, { env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const base = git(["rev-parse", `${baseRef}^{commit}`]).trim();
const target = git(["rev-parse", `${targetRef}^{commit}`]).trim();
const states = new Map();
const patches = new Map();
for (const slug of selected) {
  const directory = `.tpatch/features/${slug}`;
  states.set(slug, JSON.parse(git(["show", `${target}:${directory}/status.json`])));
  patches.set(
    slug,
    git(["show", `${target}:${directory}/artifacts/post-apply.patch`]),
  );
}

const ordered = [];
const remaining = new Set(selected);
while (remaining.size > 0) {
  let progressed = false;
  for (const slug of remaining) {
    const dependencies = states.get(slug).depends_on ?? [];
    for (const dependency of dependencies) {
      if (dependency.kind !== "hard" || states.has(dependency.slug)) continue;
      const parent = JSON.parse(
        git(["show", `${target}:.tpatch/features/${dependency.slug}/status.json`]),
      );
      const absorbed = dependency.satisfied_by ?? parent.reconcile?.upstream_commit;
      if (parent.state !== "upstream_merged" || !/^[0-9a-f]{40}$/.test(absorbed ?? "")) {
        throw new Error(`${slug}: missing required root ${dependency.slug}`);
      }
      git(["merge-base", "--is-ancestor", absorbed, target]);
    }
    if (
      dependencies.some(
        (dependency) =>
          dependency.kind !== "supersedes" && remaining.has(dependency.slug),
      )
    ) {
      continue;
    }
    ordered.push(slug);
    remaining.delete(slug);
    progressed = true;
  }
  if (!progressed) throw new Error("Selected feature dependency cycle");
}

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "t3-fork-replay-"));
const index = path.join(directory, "index");
const patchFile = path.join(directory, "root.patch");
const env = { ...process.env, GIT_INDEX_FILE: index };
const records = [];
try {
  git(["read-tree", base], env);
  for (const slug of ordered) {
    const patch = patches.get(slug);
    fs.writeFileSync(patchFile, patch);
    git(["apply", "--cached", "--check", patchFile], env);
    git(["apply", "--cached", "--whitespace=nowarn", patchFile], env);
    records.push({
      slug,
      patchSha256: createHash("sha256").update(patch).digest("hex"),
      recordedApplicationBase: states.get(slug).apply?.base_commit ?? null,
      paths: git(["apply", "--numstat", patchFile]).trim().split("\n"),
    });
  }
  const tree = git(["write-tree"], env).trim();
  const residual = git([
    "diff",
    "--raw",
    "--no-abbrev",
    "--no-renames",
    target,
    tree,
    "--",
    ".",
    ":(exclude).tpatch",
  ]).trim();
  console.log(
    JSON.stringify(
      {
        base,
        target,
        orderedRoots: ordered,
        roots: records,
        strictReplay: true,
        replayedTree: tree,
        comparison: "git diff --raw --no-abbrev --no-renames <target> <tree> -- . :(exclude).tpatch",
        excluded: [".tpatch/ administrative metadata only"],
        includesFileModes: true,
        residual: residual ? residual.split("\n") : [],
        exact: residual === "",
        scope: "Recorded tracked source and file modes, not semantic or runtime qualification",
      },
      null,
      2,
    ),
  );
  if (residual) process.exitCode = 1;
} finally {
  for (const file of [patchFile, index, `${index}.lock`]) {
    fs.rmSync(file, { force: true });
  }
  fs.rmdirSync(directory);
}
