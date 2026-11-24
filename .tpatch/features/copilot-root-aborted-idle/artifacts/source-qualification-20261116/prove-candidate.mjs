import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

const output = import.meta.dirname;
const target = "cf9ef8999bb82d52c622bacdb8441170b8398301";
const main = "0490e7bb2753ee455d58f9832f6ea943af81b0e0";
const upstream = "783581d461dc72cdd8f78fc8abb4ad536dfc4547";
const roots = [
  ["device-session-release", "fe6a486505b5605c61034d0515f211ac0f014fc6"],
  ["copilot-session-import", "edaafaa1d0715000cb44acb06ea75a0058dbd5e4"],
  ["scanner-canonical-path-exclusion", "d7ff2a45390df46ec7370ce2ea2ba39cc6af4783"],
  ["workspace-handoff-recovery", "8c6c1e8badce2cb04cd253ab6d752ded6ed9faa2"],
  ["copilot-native-ingress-supervision", "0c550b84876fc1a74692dadb74c99aa9b46dcf99"],
  ["copilot-text-generation-failure-diagnostics", "62c69bff27e982b23fd23754703e4c757dfeaae1"],
  ["copilot-root-aborted-idle", target],
];
const hash = (value) => createHash("sha256").update(value).digest("hex");
const git = (args, env = process.env, input) =>
  execFileSync("git", args, { env, input, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });
const read = (file) => git(["show", `${target}:${file}`]);
const artifact = (slug, name) => read(`.tpatch/features/${slug}/artifacts/${name}`);
const index = path.join(output, "proof.index");
const env = { ...process.env, GIT_INDEX_FILE: index };
const reset = (base) => {
  fs.rmSync(index, { force: true });
  git(["read-tree", base], env);
};
const comparison = (expected, actual) => git([
  "diff", "--raw", "--no-abbrev", "--no-renames", expected, actual,
  "--", ".", ":(exclude).tpatch",
]).trim().split("\n").filter(Boolean);
const tree = () => git(["write-tree"], env).trim();
const apply = (patch, args = []) => git(["apply", "--cached", "--whitespace=nowarn", ...args, "-"], env, patch);
const check = (patch, reverse = false) => spawnSync("git", [
  "apply", "--cached", "--check", ...(reverse ? ["--reverse"] : []), "-",
], { env, input: patch, encoding: "utf8" }).status === 0;
const canonical = (slug, permitPostimage = false) => {
  const patch = artifact(slug, "post-apply.patch");
  const sections = patch.split(/(?=^diff --git )/m).filter((part) => part.trim());
  const results = [];
  for (const section of sections) {
    const header = section.split("\n", 1)[0];
    if (check(section)) {
      apply(section);
      results.push({ header, result: "strict-forward" });
    } else if (permitPostimage && check(section, true)) {
      results.push({ header, result: "strict-reverse-proves-existing-postimage" });
    } else {
      throw new Error(`${slug}: canonical section cannot forward-apply or prove postimage: ${header}`);
    }
  }
  return { slug, patchSha256: hash(patch), results };
};
const recipe = (slug) => {
  const text = artifact(slug, "apply-recipe.json");
  const parsed = JSON.parse(text);
  const operations = [];
  for (const op of parsed.operations) {
    if (op.type === "ensure-directory") continue;
    if (!op.path || op.path.startsWith("/") || op.path.split("/").includes(".."))
      throw new Error(`Unsafe recipe path: ${op.path}`);
    const entry = git(["ls-files", "--stage", "--", op.path], env).trim();
    const mode = entry ? entry.split(" ", 1)[0] : "100644";
    if (mode !== "100644" && mode !== "100755") throw new Error(`Unsupported mode ${mode}`);
    const previous = entry ? git(["show", `:${op.path}`], env) : null;
    let content;
    if (op.type === "write-file") {
      if (op.preimage_hash === "" && previous !== null) throw new Error(`${slug}: new-file already exists: ${op.path}`);
      if (op.preimage_hash && (previous === null || `sha256:${hash(previous)}` !== op.preimage_hash))
        throw new Error(`${slug}: preimage mismatch: ${op.path}`);
      content = op.content;
    } else if (op.type === "replace-in-file") {
      if (previous === null || !op.search || previous.split(op.search).length !== 2)
        throw new Error(`${slug}: nonunique/missing search: ${op.path}`);
      content = previous.replace(op.search, op.replace);
    } else if (op.type === "append-file") {
      if (previous === null) throw new Error(`${slug}: missing append target: ${op.path}`);
      content = previous + op.content;
    } else throw new Error(`Unsupported operation: ${op.type}`);
    const oid = git(["hash-object", "-w", "--stdin"], env, content).trim();
    git(["update-index", "--add", "--cacheinfo", mode, oid, op.path], env);
    operations.push({ path: op.path, type: op.type, mode, preimage: op.preimage_hash ?? "legacy-absent" });
  }
  return { slug, recipeSha256: hash(text), operations };
};
const report = { target, main, upstream, excludes: [".tpatch administrative metadata only"], includesFileModes: true, roots: [], provenanceGaps: [] };
try {
  for (const [slug, landing] of roots) {
    const state = JSON.parse(read(`.tpatch/features/${slug}/status.json`));
    const base = state.apply.base_commit;
    reset(base);
    const patch = canonical(slug);
    const canonicalTree = tree();
    reset(base);
    const generated = recipe(slug);
    const recipeTree = tree();
    const residual = comparison(landing, canonicalTree);
    const recipeResidual = comparison(landing, recipeTree);
    const trailers = git(["interpret-trailers", "--parse"], process.env, git(["show", "-s", "--format=%B", landing]));
    for (const [key, value] of Object.entries({
      "Tpatch-Feature": slug,
      "Tpatch-Patch-SHA": patch.patchSha256,
      "Tpatch-Recipe-SHA": generated.recipeSha256,
      "Tpatch-Base-Commit": base,
      "Co-authored-by": "Copilot <223556219+Copilot@users.noreply.github.com>",
    })) {
      if (!trailers.split("\n").includes(`${key}: ${value}`)) throw new Error(`${slug}: invalid trailer ${key}`);
    }
    const generations = JSON.parse(artifact(slug, "patch-generations.json"));
    const generation = generations.generations.find((g) => g.generation === generations.current_generation);
    const parents = [];
    for (const dep of generation.dependencies ?? []) {
      const current = JSON.parse(artifact(dep.slug, "patch-generations.json"));
      const parent = current.generations.find((g) => g.generation === current.current_generation);
      const matches = dep.parent_generation === parent.generation &&
        dep.parent_patch_sha256 === parent.patch_sha256 && dep.parent_recipe_sha256 === parent.recipe_sha256;
      const actualPatchSha256 = hash(artifact(dep.slug, "post-apply.patch"));
      const actualRecipeSha256 = hash(artifact(dep.slug, "apply-recipe.json"));
      const manifestMatchesBytes = parent.patch_sha256 === actualPatchSha256 && parent.recipe_sha256 === actualRecipeSha256;
      parents.push({ slug: dep.slug, matchesManifest: matches, generation: parent.generation,
        manifestPatchSha256: parent.patch_sha256, manifestRecipeSha256: parent.recipe_sha256,
        actualPatchSha256, actualRecipeSha256, manifestMatchesBytes });
      if (!matches) throw new Error(`${slug}: stale parent ${dep.slug}`);
      if (!manifestMatchesBytes) report.provenanceGaps.push({ priority: "P2", slug, parent: dep.slug,
        reason: "Inherited parent manifest checksum does not match committed artifact bytes.",
        capturedRecipeSha256: dep.parent_recipe_sha256, actualRecipeSha256 });
    }
    const historicalStatusParents = [];
    for (const dep of state.depends_on ?? []) {
      if (parents.some((parent) => parent.slug === dep.slug)) continue;
      const parentFile = `.tpatch/features/${dep.slug}/artifacts/patch-generations.json`;
      const current = JSON.parse(read(parentFile));
      const previous = JSON.parse(git(["show", `${base}:${parentFile}`]));
      const currentGeneration = current.generations.find((g) => g.generation === current.current_generation);
      const previousGeneration = previous.generations.find((g) => g.generation === previous.current_generation);
      const matches = hash(JSON.stringify(currentGeneration)) === hash(JSON.stringify(previousGeneration));
      historicalStatusParents.push({ slug: dep.slug, kind: dep.kind, generation: current.current_generation,
        matchesRecordedBase: matches, note: "Original manifest has no dependency snapshot; compared unchanged original parent generation at recorded base." });
      if (!matches) throw new Error(`${slug}: historical status parent changed: ${dep.slug}`);
      report.provenanceGaps.push({ priority: "P3", slug, parent: dep.slug,
        reason: "Declared hard dependency is absent from the original generation snapshot; unchanged base comparison is not a captured attestation." });
    }
    report.roots.push({ slug, base, landing, canonicalTree, recipeTree, patchSha256: patch.patchSha256,
      recipeSha256: generated.recipeSha256, parents, historicalStatusParents, residual, recipeResidual, trailers, exact: !residual.length && !recipeResidual.length });
    if (residual.length || recipeResidual.length) throw new Error(`${slug}: per-root source/mode mismatch`);
  }
  reset(main);
  const composition = roots.map(([slug]) => canonical(slug));
  const canonicalTree = tree();
  reset(main);
  const recipes = roots.map(([slug]) => recipe(slug));
  const recipeTree = tree();
  report.composition = { base: main, orderedRoots: roots.map(([slug]) => slug), canonicalTree, recipeTree,
    residual: comparison(target, canonicalTree), recipeResidual: comparison(target, recipeTree), composition, recipes };
  const historical = JSON.parse(fs.readFileSync(".tpatch/features/copilot-native-ingress-supervision/artifacts/source-qualification-20261106/canonical-source-proof.json", "utf8")).orderedRoots;
  const complete = [...historical, ...roots.map(([slug]) => slug).filter((slug) => !historical.includes(slug))];
  reset(upstream);
  const fullRoots = complete.map((slug) => canonical(slug, true));
  const fullTree = tree();
  report.fullCanonical = { base: upstream, orderedRoots: complete, roots: fullRoots, tree: fullTree, residual: comparison(target, fullTree) };
  report.exact = !report.composition.residual.length && !report.composition.recipeResidual.length && !report.fullCanonical.residual.length;
  report.provenanceComplete = report.provenanceGaps.length === 0;
  report.sourceQualified = report.exact && report.provenanceComplete;
  if (!report.exact) process.exitCode = 1;
} catch (error) {
  report.error = error.stack;
  report.exact = false;
  process.exitCode = 1;
} finally {
  fs.rmSync(index, { force: true });
  fs.rmSync(`${index}.lock`, { force: true });
  fs.writeFileSync(path.join(output, "candidate-replay-proof.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ exactProductReplay: report.exact, provenanceComplete: report.provenanceComplete,
    sourceQualified: report.sourceQualified, provenanceGaps: report.provenanceGaps, roots: report.roots.length,
    composition: report.composition?.residual, fullCanonical: report.fullCanonical?.residual, error: report.error }, null, 2));
}
