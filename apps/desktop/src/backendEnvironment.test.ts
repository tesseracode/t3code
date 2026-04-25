import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { localTargetInstances, wslTargetInstances } = vi.hoisted(() => ({
  localTargetInstances: [] as Array<{ readonly displayLabel: string; readonly type: "local" }>,
  wslTargetInstances: [] as Array<{
    readonly displayLabel: string;
    readonly type: "wsl";
    readonly distro: string | undefined;
    readonly installSourceRoot: string | undefined;
    readonly installFingerprint: string | undefined;
  }>,
}));

const {
  extractWslDistroFromPathMock,
  getDefaultWslDistroMock,
  isNodeAvailableInWslMock,
  isWslAvailableMock,
  isWslPathMock,
  listWslDistrosMock,
  prepareWslServerBundleMock,
} = vi.hoisted(() => ({
  extractWslDistroFromPathMock: vi.fn(),
  getDefaultWslDistroMock: vi.fn(),
  isNodeAvailableInWslMock: vi.fn(),
  isWslAvailableMock: vi.fn(),
  isWslPathMock: vi.fn(),
  listWslDistrosMock: vi.fn(),
  prepareWslServerBundleMock: vi.fn(),
}));

vi.mock("./backendTarget.ts", () => ({
  LocalBackendTarget: class LocalBackendTarget {
    readonly type = "local" as const;
    readonly displayLabel = "Local";

    constructor() {
      localTargetInstances.push({
        displayLabel: this.displayLabel,
        type: this.type,
      });
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
}));

vi.mock("./wslBackendTarget.ts", () => ({
  WslBackendTarget: class WslBackendTarget {
    readonly type = "wsl" as const;
    readonly distro: string | undefined;
    readonly installSourceRoot: string | undefined;
    readonly installFingerprint: string | undefined;

    constructor(options?: {
      readonly distro?: string;
      readonly installSourceRoot?: string;
      readonly installFingerprint?: string;
    }) {
      this.distro = options?.distro;
      this.installSourceRoot = options?.installSourceRoot;
      this.installFingerprint = options?.installFingerprint;
      wslTargetInstances.push({
        displayLabel: this.displayLabel,
        type: this.type,
        distro: this.distro,
        installSourceRoot: this.installSourceRoot,
        installFingerprint: this.installFingerprint,
      });
    }

    get displayLabel(): string {
      return this.distro ? `WSL (${this.distro})` : "WSL";
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
  extractWslDistroFromPath: extractWslDistroFromPathMock,
  getDefaultWslDistro: getDefaultWslDistroMock,
  isNodeAvailableInWsl: isNodeAvailableInWslMock,
  isWslAvailable: isWslAvailableMock,
  isWslPath: isWslPathMock,
  listWslDistros: listWslDistrosMock,
}));

vi.mock("./wslServerBundle.ts", () => ({
  prepareWslServerBundle: prepareWslServerBundleMock,
}));

import { createDefaultBackendEnvironmentManager } from "./backendEnvironment.ts";

const platformDescriptor = Object.getOwnPropertyDescriptor(process, "platform");

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", {
    configurable: true,
    value: platform,
  });
}

describe("backendEnvironment", () => {
  beforeEach(() => {
    localTargetInstances.length = 0;
    wslTargetInstances.length = 0;
    extractWslDistroFromPathMock.mockReset();
    getDefaultWslDistroMock.mockReset();
    isNodeAvailableInWslMock.mockReset();
    isWslAvailableMock.mockReset();
    isWslPathMock.mockReset();
    listWslDistrosMock.mockReset();
    prepareWslServerBundleMock.mockReset();
    setPlatform("win32");
  });

  afterEach(() => {
    if (platformDescriptor) {
      Object.defineProperty(process, "platform", platformDescriptor);
    }
  });

  it("keeps the primary desktop environment local while discovering WSL environments", () => {
    isWslAvailableMock.mockReturnValue(true);
    listWslDistrosMock.mockReturnValue([
      { name: "Ubuntu-24.04", isDefault: true },
      { name: "Debian", isDefault: false },
    ]);
    isNodeAvailableInWslMock.mockReturnValue(true);
    getDefaultWslDistroMock.mockReturnValue("Ubuntu-24.04");
    prepareWslServerBundleMock.mockReturnValue({
      hostPath: "C:\\bundle",
      fingerprint: "bundle-fingerprint",
    });
    isWslPathMock.mockImplementation((folderPath: string) => folderPath.startsWith("\\\\wsl"));
    extractWslDistroFromPathMock.mockReturnValue("Debian");

    const manager = createDefaultBackendEnvironmentManager({
      rootBaseDir: "C:\\Users\\test\\.t3",
      appRoot: "D:\\Development\\TesseraCode\\t3code",
    });

    expect(manager.primaryEnvironment.key).toBe("local");
    expect(manager.listEnvironments()).toEqual([
      expect.objectContaining({
        key: "local",
        baseDir: "C:\\Users\\test\\.t3",
      }),
      expect.objectContaining({
        key: "wsl:Ubuntu-24.04",
        baseDir: "C:\\Users\\test\\.t3\\environments\\wsl\\ubuntu-24-04",
      }),
      expect.objectContaining({
        key: "wsl:Debian",
        baseDir: "C:\\Users\\test\\.t3\\environments\\wsl\\debian",
      }),
    ]);
    expect(manager.resolveEnvironmentForPath("C:\\code").key).toBe("local");
    expect(manager.resolveEnvironmentForPath("\\\\wsl.localhost\\Debian\\home\\test").key).toBe(
      "wsl:Debian",
    );
    expect(wslTargetInstances).toEqual([
      expect.objectContaining({
        distro: "Ubuntu-24.04",
        installSourceRoot: "C:\\bundle",
        installFingerprint: "bundle-fingerprint",
      }),
      expect.objectContaining({
        distro: "Debian",
        installSourceRoot: "C:\\bundle",
        installFingerprint: "bundle-fingerprint",
      }),
    ]);
  });

  it("falls back to the local environment when WSL environments are unavailable", () => {
    isWslAvailableMock.mockReturnValue(false);
    getDefaultWslDistroMock.mockReturnValue(undefined);
    isWslPathMock.mockReturnValue(false);

    const manager = createDefaultBackendEnvironmentManager({
      rootBaseDir: "C:\\Users\\test\\.t3",
      appRoot: "D:\\Development\\TesseraCode\\t3code",
    });

    expect(manager.primaryEnvironment.key).toBe("local");
    expect(manager.listEnvironments()).toHaveLength(1);
    expect(manager.resolveEnvironmentForPath("\\\\wsl.localhost\\Ubuntu\\home\\test").key).toBe(
      "local",
    );
  });
});
