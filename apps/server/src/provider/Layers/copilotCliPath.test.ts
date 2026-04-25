import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveBundledCopilotCliPathFrom } from "./copilotCliPath.ts";

describe("copilotCliPath", () => {
  it("walks up from a cjs SDK entrypoint to find the Copilot loader", () => {
    const currentDir = join("D:\\repo", "apps", "server", "src", "provider", "Layers");
    const sdkEntrypoint = join(
      "D:\\repo",
      "node_modules",
      "@github",
      "copilot-sdk",
      "dist",
      "cjs",
      "index.js",
    );
    const sdkPackageDir = join("D:\\repo", "node_modules", "@github", "copilot-sdk");
    const loaderPath = join("D:\\repo", "node_modules", "@github", "copilot", "npm-loader.js");
    const existing = new Set([join(sdkPackageDir, "package.json"), loaderPath]);

    const resolved = resolveBundledCopilotCliPathFrom({
      currentDir,
      sdkEntrypoint,
      exists: (path) => existing.has(path),
    });

    expect(resolved).toBe(loaderPath);
  });

  it("prefers the Windows binary from the real Copilot package store over the loader", () => {
    const currentDir = join("D:\\repo", "apps", "server", "src", "provider", "Layers");
    const sdkPackageDir = join(
      "D:\\repo",
      "node_modules",
      ".bun",
      "@github+copilot-sdk@0.3.0",
      "node_modules",
      "@github",
      "copilot-sdk",
    );
    const copilotPackageDir = join(
      "D:\\repo",
      "node_modules",
      ".bun",
      "@github+copilot@1.0.36",
      "node_modules",
      "@github",
      "copilot",
    );
    const loaderPath = join(dirname(dirname(sdkPackageDir)), "@github", "copilot", "npm-loader.js");
    const binaryPath = join(
      dirname(dirname(copilotPackageDir)),
      "@github",
      "copilot-win32-x64",
      "copilot.exe",
    );
    const existing = new Set([loaderPath, binaryPath]);

    const resolved = resolveBundledCopilotCliPathFrom({
      currentDir,
      sdkPackageDir,
      copilotPackageDir,
      platform: "win32",
      arch: "x64",
      exists: (path) => existing.has(path),
    });

    expect(resolved).toBe(binaryPath);
  });
});
