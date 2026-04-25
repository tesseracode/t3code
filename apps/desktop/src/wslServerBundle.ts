import * as Crypto from "node:crypto";
import * as FS from "node:fs";
import * as OS from "node:os";
import * as Path from "node:path";

import rootPackageJson from "../../../package.json" with { type: "json" };
import serverPackageJson from "../../server/package.json" with { type: "json" };

interface WslServerRuntimePackageJson {
  readonly name: string;
  readonly version: string;
  readonly repository: {
    readonly type: string;
    readonly url: string;
    readonly directory: string;
  };
  readonly bin: Record<string, string>;
  readonly type: string;
  readonly engines: Record<string, string>;
  readonly files: string[];
  readonly dependencies: Record<string, string>;
  readonly overrides: Record<string, string>;
}

export interface PreparedWslServerBundle {
  readonly hostPath: string;
  readonly fingerprint: string;
}

function resolveCatalogDependencies(
  dependencies: Record<string, string>,
  catalog: Record<string, string>,
  label: string,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(dependencies).map(([name, spec]) => {
      if (typeof spec !== "string" || !spec.startsWith("catalog:")) {
        return [name, spec];
      }

      const catalogKey = spec.slice("catalog:".length).trim();
      const lookupKey = catalogKey.length > 0 ? catalogKey : name;
      const resolved = catalog[lookupKey];

      if (typeof resolved !== "string" || resolved.length === 0) {
        throw new Error(
          `Unable to resolve '${spec}' for ${label} dependency '${name}'. Expected key '${lookupKey}' in root workspace catalog.`,
        );
      }

      return [name, resolved];
    }),
  );
}

export function createWslServerRuntimePackageJson(): WslServerRuntimePackageJson {
  return {
    name: serverPackageJson.name,
    version: serverPackageJson.version,
    repository: serverPackageJson.repository,
    bin: serverPackageJson.bin,
    type: serverPackageJson.type,
    engines: serverPackageJson.engines,
    files: serverPackageJson.files,
    dependencies: resolveCatalogDependencies(
      serverPackageJson.dependencies,
      rootPackageJson.workspaces.catalog,
      "apps/server",
    ),
    overrides: resolveCatalogDependencies(
      rootPackageJson.overrides,
      rootPackageJson.workspaces.catalog,
      "apps/server",
    ),
  };
}

function updateHashFromDirectory(hash: Crypto.Hash, directory: string, relativeRoot = ""): void {
  const entries = FS.readdirSync(directory, { withFileTypes: true }).toSorted((left, right) =>
    left.name.localeCompare(right.name),
  );

  for (const entry of entries) {
    const absolutePath = Path.join(directory, entry.name);
    const relativePath = relativeRoot.length > 0 ? `${relativeRoot}/${entry.name}` : entry.name;
    hash.update(relativePath);

    if (entry.isDirectory()) {
      hash.update("dir");
      updateHashFromDirectory(hash, absolutePath, relativePath);
      continue;
    }

    if (entry.isFile()) {
      hash.update("file");
      hash.update(FS.readFileSync(absolutePath));
    }
  }
}

function computeBundleFingerprint(sourceDistDir: string, runtimePackageJson: string): string {
  const hash = Crypto.createHash("sha256");
  hash.update(runtimePackageJson);
  updateHashFromDirectory(hash, sourceDistDir);
  return hash.digest("hex").slice(0, 16);
}

export function prepareWslServerBundle(input: {
  readonly appRoot: string;
  readonly cacheRoot?: string;
}): PreparedWslServerBundle | undefined {
  const sourceDistDir = Path.join(input.appRoot, "apps/server/dist");
  const sourceEntry = Path.join(sourceDistDir, "bin.mjs");
  if (!FS.existsSync(sourceEntry)) {
    return undefined;
  }

  const runtimePackageJson = `${JSON.stringify(createWslServerRuntimePackageJson(), null, 2)}\n`;
  const fingerprint = computeBundleFingerprint(sourceDistDir, runtimePackageJson);
  const cacheRoot = input.cacheRoot ?? Path.join(OS.homedir(), ".t3", "wsl-server-bundles");
  const bundleDir = Path.join(cacheRoot, fingerprint);
  const fingerprintFile = Path.join(bundleDir, ".wsl-bundle-fingerprint");

  if (!FS.existsSync(fingerprintFile)) {
    FS.rmSync(bundleDir, { recursive: true, force: true });
    FS.mkdirSync(Path.join(bundleDir, "apps/server"), { recursive: true });
    FS.cpSync(sourceDistDir, Path.join(bundleDir, "apps/server/dist"), { recursive: true });
    FS.writeFileSync(Path.join(bundleDir, "apps/server/package.json"), runtimePackageJson);
    FS.writeFileSync(fingerprintFile, `${fingerprint}\n`);
  }

  return {
    hostPath: bundleDir,
    fingerprint,
  };
}
