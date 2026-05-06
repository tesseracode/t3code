import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isWslAvailable: vi.fn(),
  isNodeAvailableInWsl: vi.fn(),
  listWslDistros: vi.fn(),
  prepareWslServerBundle: vi.fn(),
}));

vi.mock("./backendTarget.ts", () => ({
  LocalBackendTarget: class LocalBackendTarget {
    readonly type = "local" as const;
    readonly displayLabel = "Local";
    ensureReady(): boolean {
      return true;
    }
    spawn(): never {
      throw new Error("not implemented in test");
    }
    translatePath(hostPath: string): string {
      return hostPath;
    }
    isAvailable(): boolean {
      return true;
    }
  },
}));

vi.mock("./wslBackendTarget.ts", () => ({
  WslBackendTarget: class WslBackendTarget {
    readonly type = "wsl" as const;
    readonly displayLabel: string;
    constructor(options?: { readonly distro?: string }) {
      this.displayLabel = options?.distro ? `WSL (${options.distro})` : "WSL";
    }
    ensureReady(): boolean {
      return true;
    }
    spawn(): never {
      throw new Error("not implemented in test");
    }
    translatePath(hostPath: string): string {
      return hostPath;
    }
    isAvailable(): boolean {
      return true;
    }
  },
  extractWslDistroFromPath: vi.fn(),
  isNodeAvailableInWsl: mocks.isNodeAvailableInWsl,
  isWslAvailable: mocks.isWslAvailable,
  isWslPath: vi.fn(() => false),
  listWslDistros: mocks.listWslDistros,
}));

vi.mock("./wslServerBundle.ts", () => ({
  prepareWslServerBundle: mocks.prepareWslServerBundle,
}));

import { createDefaultBackendEnvironmentManager } from "./backendEnvironment.ts";

describe("createDefaultBackendEnvironmentManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isWslAvailable.mockReturnValue(false);
    mocks.isNodeAvailableInWsl.mockReturnValue(false);
    mocks.listWslDistros.mockReturnValue([]);
    mocks.prepareWslServerBundle.mockReturnValue(undefined);
  });

  it("falls back to the local environment when WSL bundle preparation fails", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.isWslAvailable.mockReturnValue(true);
    mocks.prepareWslServerBundle.mockImplementation(() => {
      throw new Error("ENOENT: not found in asar");
    });

    const manager = createDefaultBackendEnvironmentManager({
      rootBaseDir: "C:/Users/test/.t3",
      appRoot: "C:/Program Files/T3 Code/resources/app.asar",
    });

    expect(manager.primaryEnvironment.key).toBe("local");
    expect(manager.listEnvironments().map((environment) => environment.key)).toEqual(["local"]);
    expect(consoleError).toHaveBeenCalledWith(
      "[desktop] Failed to prepare WSL server bundle; WSL managed environments disabled: ENOENT: not found in asar",
    );
  });

  it("adds available WSL environments when the bundle can be prepared", () => {
    mocks.isWslAvailable.mockReturnValue(true);
    mocks.prepareWslServerBundle.mockReturnValue({
      hostPath: "C:/Users/test/.t3/wsl-server-bundles/fingerprint",
      fingerprint: "fingerprint",
    });
    mocks.listWslDistros.mockReturnValue([{ name: "Ubuntu", isDefault: true }]);
    mocks.isNodeAvailableInWsl.mockReturnValue(true);

    const manager = createDefaultBackendEnvironmentManager({
      rootBaseDir: "C:/Users/test/.t3",
      appRoot: "C:/Program Files/T3 Code/resources/app.asar",
    });

    expect(manager.listEnvironments().map((environment) => environment.key)).toEqual([
      "local",
      "wsl:Ubuntu",
    ]);
  });
});
