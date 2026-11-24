import { describe, expect, it } from "vite-plus/test";
import { decide } from "../../.github/scripts/ci-changes.cjs";

const packages = [
  { name: "@t3tools/web", dir: "apps/web", hasTest: true, deps: [] },
  { name: "t3", dir: "apps/server", hasTest: true, deps: [] },
];

const metadata = [
  ".tpatch/features/example/artifacts/post-apply.patch",
  ".tpatch/features/example/status.json",
  ".tpatch/tools/generate-recipe.cjs",
];

describe("administrative patch evidence", () => {
  it("does not select application packages for metadata-only changes", () => {
    expect(decide(metadata, packages, false).affected).toEqual([]);
  });

  it("preserves product and dependent selection in a mixed change", () => {
    const source = ["apps/web/src/example.ts"];
    expect(decide([...metadata, ...source], packages, false)).toEqual(
      decide(source, packages, false),
    );
  });

  it("keeps lookalike paths conservative", () => {
    expect(decide([".tpatch-other/policy.json"], packages, false).affected).toEqual(
      packages.map((entry) => entry.name).sort(),
    );
  });
});
