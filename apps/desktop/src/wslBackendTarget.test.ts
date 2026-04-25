import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { execFileSyncMock, spawnMock } = vi.hoisted(() => ({
  execFileSyncMock: vi.fn(),
  spawnMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFileSync: execFileSyncMock,
  spawn: spawnMock,
}));

import {
  canReachNpmRegistryInWsl,
  installServerInWsl,
  listWslDistros,
  WslBackendTarget,
} from "./wslBackendTarget.ts";

const platformDescriptor = Object.getOwnPropertyDescriptor(process, "platform");

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", {
    configurable: true,
    value: platform,
  });
}

describe("wslBackendTarget", () => {
  beforeEach(() => {
    execFileSyncMock.mockReset();
    spawnMock.mockReset();
    setPlatform("win32");
  });

  afterEach(() => {
    if (platformDescriptor) {
      Object.defineProperty(process, "platform", platformDescriptor);
    }
  });

  it("decodes UTF-16LE distro names from wsl.exe", () => {
    execFileSyncMock.mockReturnValue(Buffer.from("\uFEFFUbuntu-24.04\nDebian\n", "utf16le"));

    expect(listWslDistros()).toEqual([
      { name: "Ubuntu-24.04", isDefault: true },
      { name: "Debian", isDefault: false },
    ]);
    expect(execFileSyncMock).toHaveBeenCalledWith(
      "wsl.exe",
      ["--list", "--quiet"],
      expect.objectContaining({ timeout: 10000 }),
    );
  });

  it("installs the staged server bundle inside WSL using npm instead of copying Windows node_modules", () => {
    execFileSyncMock
      .mockReturnValueOnce(Buffer.from(""))
      .mockReturnValueOnce("/mnt/c/Users/test/bundle\n")
      .mockReturnValueOnce(Buffer.from(""))
      .mockReturnValueOnce(Buffer.from(""));

    const installed = installServerInWsl("C:\\Users\\test\\bundle", "Ubuntu-24.04");

    expect(installed).toBe(true);
    expect(execFileSyncMock).toHaveBeenNthCalledWith(
      1,
      "wsl.exe",
      [
        "-d",
        "Ubuntu-24.04",
        "--exec",
        "bash",
        "-c",
        expect.stringContaining("npm ping --loglevel error >/dev/null"),
      ],
      expect.objectContaining({ timeout: 20000 }),
    );
    expect(execFileSyncMock).toHaveBeenNthCalledWith(
      2,
      "wsl.exe",
      ["-d", "Ubuntu-24.04", "--exec", "wslpath", "-u", "C:\\Users\\test\\bundle"],
      expect.objectContaining({ encoding: "utf-8", timeout: 5000 }),
    );

    const installArgs = execFileSyncMock.mock.calls[2]?.[1] as string[];
    const installScript = installArgs[5];

    expect(installArgs).toEqual([
      "-d",
      "Ubuntu-24.04",
      "--exec",
      "bash",
      "-c",
      expect.any(String),
      "bash",
      "/mnt/c/Users/test/bundle",
    ]);
    expect(installScript).toContain(
      "npm install --omit=dev --no-package-lock --no-audit --no-fund",
    );
    expect(installScript).not.toContain("node_modules");
  });

  it("fails fast when the npm registry is unreachable from WSL", () => {
    execFileSyncMock.mockImplementation(() => {
      throw new Error("connect ETIMEDOUT");
    });

    expect(canReachNpmRegistryInWsl("Ubuntu-24.04")).toBe(false);
    expect(installServerInWsl("C:\\Users\\test\\bundle", "Ubuntu-24.04")).toBe(false);
    expect(execFileSyncMock).toHaveBeenCalledTimes(2);
  });

  it("reinstalls the bundle when the installed fingerprint is stale", () => {
    execFileSyncMock.mockImplementation((file: string, args: string[]) => {
      if (file !== "wsl.exe") {
        throw new Error(`Unexpected command: ${file}`);
      }

      const command = args.join(" ");
      if (command.includes("--status")) {
        return Buffer.from("");
      }
      if (command.includes("node --version")) {
        return Buffer.from("v24.13.1\n");
      }
      if (command.includes("npm ping --loglevel error >/dev/null")) {
        return Buffer.from("");
      }
      if (command.includes('test -f "$HOME/.t3/server/apps/server/dist/bin.mjs"')) {
        return Buffer.from("");
      }
      if (command.includes('cat "$HOME/.t3/server/.wsl-bundle-fingerprint"')) {
        return "stale-fingerprint\n";
      }
      if (command.includes("wslpath -u C:\\Users\\test\\bundle")) {
        return "/mnt/c/Users/test/bundle\n";
      }
      if (command.includes("npm install --omit=dev --no-package-lock --no-audit --no-fund")) {
        return Buffer.from("");
      }

      throw new Error(`Unexpected wsl.exe args: ${command}`);
    });

    const target = new WslBackendTarget({
      distro: "Ubuntu-24.04",
      installSourceRoot: "C:\\Users\\test\\bundle",
      installFingerprint: "expected-fingerprint",
    });

    expect(target.ensureReady()).toBe(true);
    expect(
      execFileSyncMock.mock.calls.some(
        ([file, args]) =>
          file === "wsl.exe" &&
          Array.isArray(args) &&
          args.some((value) => typeof value === "string" && value.includes("npm install")),
      ),
    ).toBe(true);
  });
});
