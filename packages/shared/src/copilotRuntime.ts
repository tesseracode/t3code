export function copilotLinuxExecutableMembers(arch: "x64" | "arm64"): ReadonlyArray<string> {
  const root = `node_modules/@github/copilot-linux-${arch}`;
  return [
    `${root}/copilot`,
    `${root}/ripgrep/bin/linux-${arch}/rg`,
    `${root}/tgrep/bin/linux-${arch}/tgrep`,
  ];
}

/** Members are relative to the single top-level Linux CLI archive directory. */
export function validateCopilotLinuxArchiveMembers(
  members: ReadonlyArray<string>,
  arch: "x64" | "arm64",
): string | null {
  const prefix = "node_modules/@github/";
  const packages = new Set(
    members.flatMap((member) => {
      if (!member.startsWith(prefix)) return [];
      const name = member.slice(prefix.length).split("/")[0]!;
      return name === "copilot" || name.startsWith("copilot-") ? [name] : [];
    }),
  );
  if (packages.size === 0) return null;
  const expected = new Set(["copilot", "copilot-sdk", `copilot-linux-${arch}`]);
  if (packages.size !== expected.size || [...packages].some((name) => !expected.has(name))) {
    return "Copilot archive must contain its SDK, runtime and exactly one matching Linux platform package.";
  }
  const required = [
    ...[...expected].map((name) => `${prefix}${name}/package.json`),
    ...copilotLinuxExecutableMembers(arch),
  ];
  if (required.some((file) => members.filter((member) => member === file).length !== 1)) {
    return "Copilot archive has missing or duplicate runtime manifests or commands.";
  }
  const platformRoot = `${prefix}copilot-linux-${arch}/`;
  const commands = members.filter(
    (member) =>
      member.startsWith(platformRoot) &&
      /\/(?:copilot(?:\.exe)?|(?:ripgrep|tgrep)\/bin\/[^/]+\/(?:rg|tgrep)(?:\.exe)?)$/.test(member),
  );
  const expectedCommands = new Set(copilotLinuxExecutableMembers(arch));
  if (commands.length !== 3 || commands.some((member) => !expectedCommands.has(member))) {
    return "Copilot archive contains unexpected platform commands.";
  }
  return null;
}

/** The same POSIX checks are used before cache promotion and on every warm reuse. */
export function buildCopilotExecutableReadinessScript(): string {
  return [
    "copilot_payload_present() {",
    '  for candidate in "$1/node_modules/@github/copilot" "$1"/node_modules/@github/copilot-*; do',
    '    if [ -e "$candidate" ] || [ -L "$candidate" ]; then return 0; fi',
    "  done",
    "  return 1",
    "}",
    "copilot_payload_layout() {",
    '  [ -d "$1/node_modules" ] && [ ! -L "$1/node_modules" ] || return 1',
    '  [ -d "$1/node_modules/@github" ] && [ ! -L "$1/node_modules/@github" ] || return 1',
    '  for candidate in "$1/node_modules/@github/copilot" "$1/node_modules/@github/copilot-sdk"; do',
    '    [ -d "$candidate" ] && [ ! -L "$candidate" ] && [ -f "$candidate/package.json" ] && [ ! -L "$candidate/package.json" ] || return 1',
    "  done",
    "  copilot_package_count=0",
    '  for candidate in "$1"/node_modules/@github/copilot-*; do',
    '    [ -e "$candidate" ] || [ -L "$candidate" ] || continue',
    '    case "$candidate" in',
    "      */copilot-sdk) continue ;;",
    "      */copilot-linux-x64) copilot_target=linux-x64 ;;",
    "      */copilot-linux-arm64) copilot_target=linux-arm64 ;;",
    "      *) return 1 ;;",
    "    esac",
    '    [ -d "$candidate" ] && [ ! -L "$candidate" ] || return 1',
    '    copilot_package_dir="$candidate"',
    "    copilot_package_count=$((copilot_package_count + 1))",
    "  done",
    '  [ "$copilot_package_count" -eq 1 ] || return 1',
    '  case "$(uname -m)" in',
    '    x86_64|amd64) [ "$copilot_target" = linux-x64 ] || return 1 ;;',
    '    aarch64|arm64) [ "$copilot_target" = linux-arm64 ] || return 1 ;;',
    "    *) return 1 ;;",
    "  esac",
    '  [ -f "$copilot_package_dir/package.json" ] && [ ! -L "$copilot_package_dir/package.json" ] || return 1',
    '  for directory in "$copilot_package_dir/ripgrep" "$copilot_package_dir/ripgrep/bin" "$copilot_package_dir/ripgrep/bin/$copilot_target" "$copilot_package_dir/tgrep" "$copilot_package_dir/tgrep/bin" "$copilot_package_dir/tgrep/bin/$copilot_target"; do',
    '    [ -d "$directory" ] && [ ! -L "$directory" ] || return 1',
    "  done",
    '  for command_dir in "$copilot_package_dir"/ripgrep/bin/* "$copilot_package_dir"/tgrep/bin/*; do',
    '    [ "${command_dir##*/}" = "$copilot_target" ] || return 1',
    "  done",
    '  for executable in "$copilot_package_dir/copilot" "$copilot_package_dir/ripgrep/bin/$copilot_target/rg" "$copilot_package_dir/tgrep/bin/$copilot_target/tgrep"; do',
    '    [ -f "$executable" ] && [ ! -L "$executable" ] || return 1',
    "  done",
    "}",
    "copilot_executable_payload_ready() {",
    '  copilot_payload_present "$1" || return 0',
    '  if ! copilot_payload_layout "$1"; then',
    "    printf 'Linux Copilot payload has a missing, ambiguous, or incompatible layout\\n' >&2",
    "    return 1",
    "  fi",
    '  for executable in "$copilot_package_dir/copilot" "$copilot_package_dir/ripgrep/bin/$copilot_target/rg" "$copilot_package_dir/tgrep/bin/$copilot_target/tgrep"; do',
    '    if [ ! -x "$executable" ]; then',
    "      printf 'Linux Copilot command is not executable: %s\\n' \"$executable\" >&2",
    "      return 1",
    "    fi",
    "  done",
    "}",
    "normalize_copilot_executable_modes() {",
    '  copilot_payload_present "$1" || return 0',
    '  if ! copilot_payload_layout "$1"; then',
    "    printf 'Linux Copilot payload has a missing, ambiguous, or incompatible layout\\n' >&2",
    "    return 1",
    "  fi",
    '  for executable in "$copilot_package_dir/copilot" "$copilot_package_dir/ripgrep/bin/$copilot_target/rg" "$copilot_package_dir/tgrep/bin/$copilot_target/tgrep"; do',
    '    if ! chmod 0755 "$executable"; then',
    "      printf 'Could not make Linux Copilot command executable: %s\\n' \"$executable\" >&2",
    "      return 1",
    "    fi",
    "  done",
    '  copilot_executable_payload_ready "$1"',
    "}",
  ].join("\n");
}
