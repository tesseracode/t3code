import * as Path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { bootstrapEndMock, bootstrapWriteMock, existsSyncMock, spawnMock } = vi.hoisted(() => ({
  bootstrapEndMock: vi.fn(),
  bootstrapWriteMock: vi.fn(),
  existsSyncMock: vi.fn(),
  spawnMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  spawn: spawnMock,
}));

vi.mock("node:fs", () => ({
  existsSync: existsSyncMock,
}));

vi.mock("electron", () => ({
  app: {
    isPackaged: false,
    getAppPath: () => "/ignored/app/path",
  },
}));

import {
  createDefaultBackendTarget,
  LocalBackendTarget,
  type BackendBootstrapConfig,
} from "./backendTarget.ts";

const TEST_BOOTSTRAP_CONFIG: BackendBootstrapConfig = {
  mode: "desktop",
  noBrowser: true,
  port: 3210,
  t3Home: "C:\\Users\\test\\.t3",
  host: "127.0.0.1",
  desktopBootstrapToken: "bootstrap-token",
};

const EXPECTED_REPO_ROOT = Path.resolve(
  Path.join(Path.dirname(fileURLToPath(import.meta.url)), "../../.."),
);
const EXPECTED_BACKEND_ENTRY = Path.join(EXPECTED_REPO_ROOT, "apps/server/dist/bin.mjs");

describe("backendTarget", () => {
  beforeEach(() => {
    bootstrapEndMock.mockReset();
    bootstrapWriteMock.mockReset();
    existsSyncMock.mockReset();
    spawnMock.mockReset();
    spawnMock.mockReturnValue({
      stdio: [null, null, null, { end: bootstrapEndMock, write: bootstrapWriteMock }],
    });
  });

  it("prefers the local backend target by default", () => {
    expect(createDefaultBackendTarget()).toBeInstanceOf(LocalBackendTarget);
  });

  it("resolves the local backend entry from the repo root in development", () => {
    existsSyncMock.mockReturnValue(true);

    const target = new LocalBackendTarget();

    expect(target.isAvailable()).toBe(true);
    expect(existsSyncMock).toHaveBeenCalledWith(EXPECTED_BACKEND_ENTRY);
  });

  it("spawns the local backend from the repo root in development", () => {
    const target = new LocalBackendTarget();

    const result = target.spawn(TEST_BOOTSTRAP_CONFIG, {
      env: { TEST_ENV: "1" },
      captureOutput: true,
    });

    expect(spawnMock).toHaveBeenCalledWith(
      process.execPath,
      [EXPECTED_BACKEND_ENTRY, "--bootstrap-fd", "3"],
      expect.objectContaining({
        cwd: EXPECTED_REPO_ROOT,
        env: expect.objectContaining({
          ELECTRON_RUN_AS_NODE: "1",
          TEST_ENV: "1",
        }),
        stdio: ["ignore", "pipe", "pipe", "pipe"],
      }),
    );
    expect(result.bootstrapDelivered).toBe(true);
    expect(bootstrapWriteMock).toHaveBeenCalledWith(`${JSON.stringify(TEST_BOOTSTRAP_CONFIG)}\n`);
    expect(bootstrapEndMock).toHaveBeenCalled();
  });
});
