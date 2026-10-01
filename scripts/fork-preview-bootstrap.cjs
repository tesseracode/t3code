"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { app } = require("electron");

const home = os.homedir();
const root = path.resolve(process.env.T3CODE_FORK_PREVIEW_HOME || path.join(home, ".t3-fork-preview"));
const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
const protectedRoots = [
  path.join(home, ".t3"),
  ...(process.env.T3CODE_DESKTOP_ISOLATED_PREVIEW === "true" ? [] : [process.env.T3CODE_HOME]),
  ...["t3code", "t3code-dev", "T3 Code (Alpha)", "T3 Code (Dev)"].flatMap((name) => [
    path.join(home, "Library", "Application Support", name),
    path.join(home, ".config", name),
    path.join(appData, name),
  ]),
].filter(Boolean).map((value) => path.resolve(value));
const canonical = (value) => {
  if (fs.existsSync(value)) return fs.realpathSync(value);
  const parent = path.dirname(value);
  return parent === value ? value : path.join(canonical(parent), path.basename(value));
};
const resolved = canonical(root);
if (resolved === canonical(home) || protectedRoots.some((value) => {
  const protectedRoot = canonical(value);
  return resolved === protectedRoot || resolved.startsWith(protectedRoot + path.sep);
})) {
  throw new Error("Fork preview refuses to use the ordinary T3 profile or home directory.");
}
const userData = path.join(root, "electron");
if (fs.existsSync(userData) && fs.lstatSync(userData).isSymbolicLink()) {
  throw new Error("Fork preview refuses a symlinked Electron profile.");
}
process.env.T3CODE_HOME = root;
process.env.T3CODE_DESKTOP_ISOLATED_PREVIEW = "true";
process.env.T3CODE_DISABLE_AUTO_UPDATE = "true";
process.env.T3CODE_DESKTOP_APP_USER_MODEL_ID = "com.tesseracode.t3code.preview";
delete process.env.VITE_DEV_SERVER_URL;
delete process.env.T3CODE_DEV_REMOTE_T3_SERVER_ENTRY_PATH;
delete process.env.T3CODE_PORT;
delete process.env.T3CODE_COMMIT_HASH;
fs.mkdirSync(userData, { recursive: true });
app.setPath("userData", userData);
if (app.requestSingleInstanceLock()) {
  require("./apps/desktop/dist-electron/main.cjs");
} else {
  app.quit();
}
