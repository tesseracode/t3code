// @effect-diagnostics nodeBuiltinImport:off - exercises the synchronous pre-Effect Electron bootstrap against an owned filesystem fixture.
import { describe, expect, it } from "vite-plus/test";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeVM from "node:vm";
import { forkPreviewBuildConfig, FORK_PREVIEW_APP_ID } from "./fork-preview.ts";

const bootstrap = NodeFS.readFileSync(
  new URL("../fork-preview-bootstrap.cjs", import.meta.url),
  "utf8",
);
function runBootstrap(
  options: {
    root?: string;
    existingHome?: string;
    primary?: boolean;
    inheritedPreview?: boolean;
  } = {},
) {
  const home = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3-fork-bootstrap-"));
  const env: Record<string, string> = {};
  if (options.root)
    env.T3CODE_FORK_PREVIEW_HOME = options.root === "live" ? NodePath.join(home, ".t3") : options.root;
  if (options.existingHome)
    env.T3CODE_HOME =
      options.existingHome === "preview"
        ? NodePath.join(home, ".t3-fork-preview")
        : options.existingHome;
  if (options.inheritedPreview) env.T3CODE_DESKTOP_ISOLATED_PREVIEW = "true";
  let loaded = false;
  let quit = false;
  let profile = "";
  try {
    NodeVM.runInNewContext(bootstrap, {
      process: { env },
      require: (name: string) => {
        if (name === "node:fs") return NodeFS;
        if (name === "node:os") return { homedir: () => home };
        if (name === "node:path") return NodePath;
        if (name === "electron")
          return {
            app: {
              setPath: (_key: string, value: string) => {
                profile = value;
              },
              requestSingleInstanceLock: () => options.primary !== false,
              quit: () => {
                quit = true;
              },
            },
          };
        if (name === "./apps/desktop/dist-electron/main.cjs") {
          expect(profile).toBe(NodePath.join(env.T3CODE_HOME!, "electron"));
          expect(env.T3CODE_DISABLE_AUTO_UPDATE).toBe("true");
          loaded = true;
          return {};
        }
        throw new Error(`Unexpected module ${name}`);
      },
    });
    return { home, profile, env, loaded, quit };
  } finally {
    NodeFS.rmSync(home, { recursive: true });
  }
}

describe("fork preview packaging isolation", () => {
  it("removes update feeds and stock protocol claims without mutating ordinary configuration", () => {
    const original = {
      appId: "com.t3tools.t3code",
      publish: [{ provider: "github" }],
      mac: { protocols: [{ schemes: ["t3code"] }], icon: "icon.icns" },
    };
    const result = forkPreviewBuildConfig(original);
    expect(result.appId).toBe(FORK_PREVIEW_APP_ID);
    expect(result).not.toHaveProperty("publish");
    expect(result.mac).toEqual({ protocols: [], icon: "icon.icns" });
    expect(original.publish).toHaveLength(1);
    expect(original.mac.protocols).toHaveLength(1);
  });
  it("sets isolated server and Electron homes before booting the app", () => {
    const result = runBootstrap();
    expect(result.env.T3CODE_HOME).toBe(NodePath.join(result.home, ".t3-fork-preview"));
    expect(result.profile).not.toContain(NodePath.join("Application Support", "t3code"));
    expect(result.loaded).toBe(true);
    expect(result.quit).toBe(false);
  });
  it("refuses the live profile and prevents a secondary process from booting another backend", () => {
    expect(() => runBootstrap({ root: "live" })).toThrow("ordinary T3 profile");
    expect(runBootstrap({ primary: false })).toMatchObject({ loaded: false, quit: true });
    expect(runBootstrap({ inheritedPreview: true, existingHome: "preview" }).loaded).toBe(true);
  });
});
