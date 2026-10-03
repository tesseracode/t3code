// @effect-diagnostics nodeBuiltinImport:off
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  buildCopilotExecutableReadinessScript,
  copilotLinuxExecutableMembers,
  validateCopilotLinuxArchiveMembers,
} from "./copilotRuntime.ts";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) NodeFS.rmSync(root, { recursive: true, force: true });
});
const uname = NodeChildProcess.spawnSync("uname", ["-m"], { encoding: "utf8" });
const arch = ["arm64", "aarch64"].includes(uname.stdout?.trim()) ? "arm64" : "x64";

function fixture(withCopilot = true) {
  const root = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3-copilot-modes-"));
  roots.push(root);
  const write = (relative: string, source = "{}") => {
    const file = NodePath.join(root, relative);
    NodeFS.mkdirSync(NodePath.dirname(file), { recursive: true });
    NodeFS.writeFileSync(file, source, { mode: 0o644 });
    return file;
  };
  if (withCopilot) {
    for (const name of ["copilot", "copilot-sdk", `copilot-linux-${arch}`]) {
      write(`node_modules/@github/${name}/package.json`);
    }
    for (const [index, relative] of copilotLinuxExecutableMembers(arch).entries()) {
      write(relative, `#!/bin/sh\nprintf '${["copilot", "rg", "tgrep"][index]}\\n'\n`);
    }
  }
  const run = (action: string) =>
    NodeChildProcess.spawnSync(
      "bash",
      [
        "-c",
        `set -eu\n${buildCopilotExecutableReadinessScript()}\n${action}`,
        "readiness-test",
        root,
      ],
      { encoding: "utf8" },
    );
  return { root, write, run };
}

describe("Copilot Linux archive members", () => {
  for (const arch of ["x64", "arm64"] as const) {
    const members = [
      ...["copilot", "copilot-sdk", `copilot-linux-${arch}`].map(
        (name) => `node_modules/@github/${name}/package.json`,
      ),
      ...copilotLinuxExecutableMembers(arch),
    ];
    it(`accepts a complete ${arch} payload`, () => {
      expect(validateCopilotLinuxArchiveMembers(members, arch)).toBeNull();
      expect(validateCopilotLinuxArchiveMembers([], arch)).toBeNull();
    });
    it(`rejects missing, duplicate, wrong-platform and non-target ${arch} commands`, () => {
      for (const broken of [
        members.slice(1),
        members.slice(0, -1),
        [...members, members.at(-1)!],
        [...members, "node_modules/@github/copilot-win32-x64/copilot.exe"],
        [...members, `node_modules/@github/copilot-linux-${arch}/ripgrep/bin/linux-wrong/rg`],
      ])
        expect(validateCopilotLinuxArchiveMembers(broken, arch)).not.toBeNull();
    });
  }
});

describe.skipIf(uname.status !== 0 || NodeOS.type() === "Windows_NT")(
  "production Copilot mode functions (executed)",
  () => {
    it("normalizes all three commands and preserves explicit newline fixture output", () => {
      const stage = fixture();
      expect(stage.run('copilot_executable_payload_ready "$1"').status).not.toBe(0);
      const result = stage.run(
        'normalize_copilot_executable_modes "$1"\n"$copilot_package_dir/copilot"\n"$copilot_package_dir/ripgrep/bin/$copilot_target/rg"\n"$copilot_package_dir/tgrep/bin/$copilot_target/tgrep"',
      );
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toBe("copilot\nrg\ntgrep\n");
      for (const file of copilotLinuxExecutableMembers(arch)) {
        expect(NodeFS.statSync(NodePath.join(stage.root, file)).mode & 0o777).toBe(0o755);
      }
      NodeFS.chmodSync(NodePath.join(stage.root, copilotLinuxExecutableMembers(arch)[1]!), 0o644);
      expect(stage.run('copilot_executable_payload_ready "$1"').status).not.toBe(0);
      expect(stage.run('normalize_copilot_executable_modes "$1"').status).toBe(0);
    });

    it("checks the complete layout before chmod and rejects ambiguous targets", () => {
      const stage = fixture();
      NodeFS.rmSync(NodePath.join(stage.root, copilotLinuxExecutableMembers(arch)[2]!));
      expect(stage.run('normalize_copilot_executable_modes "$1"').status).not.toBe(0);
      expect(
        NodeFS.statSync(NodePath.join(stage.root, copilotLinuxExecutableMembers(arch)[0]!)).mode &
          0o777,
      ).toBe(0o644);
      stage.write(copilotLinuxExecutableMembers(arch)[2]!);
      stage.write(
        `node_modules/@github/copilot-linux-${arch === "x64" ? "arm64" : "x64"}/package.json`,
      );
      expect(stage.run('normalize_copilot_executable_modes "$1"').status).not.toBe(0);
    });

    it("does not follow a command symlink or silently accept a missing SDK", () => {
      const stage = fixture();
      const executable = NodePath.join(stage.root, copilotLinuxExecutableMembers(arch)[0]!);
      const target = stage.write("outside-command", "#!/bin/sh\nexit 0\n");
      NodeFS.rmSync(executable);
      NodeFS.symlinkSync(target, executable);
      expect(stage.run('normalize_copilot_executable_modes "$1"').status).not.toBe(0);
      expect(NodeFS.statSync(target).mode & 0o777).toBe(0o644);
      NodeFS.rmSync(executable);
      stage.write(copilotLinuxExecutableMembers(arch)[0]!);
      NodeFS.rmSync(NodePath.join(stage.root, "node_modules/@github/copilot-sdk"), {
        recursive: true,
      });
      expect(stage.run('normalize_copilot_executable_modes "$1"').status).not.toBe(0);
    });

    it("leaves non-Copilot runtimes unchanged", () => {
      const stage = fixture(false);
      const before = NodeFS.readdirSync(stage.root);
      expect(
        stage.run('normalize_copilot_executable_modes "$1"\ncopilot_executable_payload_ready "$1"')
          .status,
      ).toBe(0);
      expect(NodeFS.readdirSync(stage.root)).toEqual(before);
    });
  },
);
