import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createWslServerRuntimePackageJson, prepareWslServerBundle } from "./wslServerBundle.ts";

describe("wslServerBundle", () => {
  it("creates a runtime package manifest with resolved dependency versions", () => {
    const runtimePackageJson = createWslServerRuntimePackageJson();

    expect(runtimePackageJson.name).toBe("t3");
    expect(runtimePackageJson.dependencies.effect).not.toContain("catalog:");
    expect(runtimePackageJson.dependencies["@effect/platform-node"]).not.toContain("catalog:");
    expect(Object.values(runtimePackageJson.dependencies)).not.toContain("workspace:*");
  });

  it("stages a portable server bundle and fingerprints dist changes", () => {
    const appRoot = fs.mkdtempSync(path.join(os.tmpdir(), "t3-wsl-bundle-app-"));
    const cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), "t3-wsl-bundle-cache-"));
    const sourceDistDir = path.join(appRoot, "apps", "server", "dist", "nested");

    try {
      fs.mkdirSync(sourceDistDir, { recursive: true });
      fs.writeFileSync(path.join(appRoot, "apps", "server", "dist", "bin.mjs"), "export {}\n");
      fs.writeFileSync(path.join(sourceDistDir, "worker.mjs"), "export const worker = true\n");

      const first = prepareWslServerBundle({ appRoot, cacheRoot });

      expect(first).toBeDefined();
      expect(fs.existsSync(path.join(first!.hostPath, "apps", "server", "dist", "bin.mjs"))).toBe(
        true,
      );
      expect(fs.existsSync(path.join(first!.hostPath, "apps", "server", "package.json"))).toBe(
        true,
      );

      const initialFingerprint = first!.fingerprint;
      fs.writeFileSync(
        path.join(appRoot, "apps", "server", "dist", "bin.mjs"),
        "export const ready = true\n",
      );

      const second = prepareWslServerBundle({ appRoot, cacheRoot });

      expect(second).toBeDefined();
      expect(second!.fingerprint).not.toBe(initialFingerprint);
      expect(second!.hostPath).not.toBe(first!.hostPath);
    } finally {
      fs.rmSync(appRoot, { recursive: true, force: true });
      fs.rmSync(cacheRoot, { recursive: true, force: true });
    }
  });
});
