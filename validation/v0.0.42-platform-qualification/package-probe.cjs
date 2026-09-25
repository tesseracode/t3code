const NodeOS = require("node:os");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const packagedRoot = process.argv[2];
if (!packagedRoot) throw new Error("Usage: package-probe.cjs <packaged root or server.asar>");
const roots = [fs.realpathSync(packagedRoot)];
if (fs.existsSync(`${packagedRoot}.unpacked`))
  roots.push(fs.realpathSync(`${packagedRoot}.unpacked`));
const contained = (file) =>
  roots.some((root) => {
    const relative = path.relative(root, file);
    return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  });

function resolvePackage(owner, name) {
  let entry;
  try {
    entry = owner.resolve(`${name}/package.json`);
  } catch (error) {
    if (error.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") throw error;
    entry = owner.resolve(name);
  }
  entry = fs.realpathSync(entry);
  if (!contained(entry)) throw new Error(`${name} resolved outside the packaged payload`);
  let directory = path.dirname(entry);
  while (contained(directory)) {
    const file = path.join(directory, "package.json");
    if (fs.existsSync(file)) {
      const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
      if (manifest.name === name) return { manifest, loader: createRequire(file) };
    }
    const parent = path.dirname(directory);
    if (parent === directory) throw new Error(`Could not identify package ${name}`);
    directory = parent;
  }
  throw new Error(`Could not identify contained package ${name}`);
}
const versions = {};
const get = (owner, name) => {
  const resolved = resolvePackage(owner, name);
  versions[name] = resolved.manifest.version;
  return resolved;
};
const root = createRequire(path.join(packagedRoot, "package.json"));
const sdk = get(root, "@github/copilot-sdk");
const runtime = get(sdk.loader, "@github/copilot");
const koffi = get(sdk.loader, "koffi");
get(runtime.loader, `@github/copilot-${NodeOS.platform()}-${NodeOS.arch()}`);
get(koffi.loader, `@koromix/koffi-${NodeOS.platform()}-${NodeOS.arch()}`);
get(sdk.loader, "vscode-jsonrpc");
get(sdk.loader, "zod");
get(runtime.loader, "detect-libc");
process.stdout.write(`${JSON.stringify(versions)}\n`);
