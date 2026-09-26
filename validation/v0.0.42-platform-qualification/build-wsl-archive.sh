#!/usr/bin/env bash
set -Eeuo pipefail
trap 'printf "WSL archive build failed at line %s\n" "$LINENO" >&2' ERR

repository=${1:?repository required}
branch=${2:?validation branch required}
expected_commit=${3:?source commit required}
destination=${4:?archive destination required}
version=${5:?release version required}
run_id=${6:?run ID required}
harness=$(cd "$(dirname "$0")" && pwd)
[[ "$expected_commit" =~ ^[a-f0-9]{40}$ && "$run_id" =~ ^[A-Za-z0-9-]+$ ]]
[[ "$(uname -m)" == x86_64 ]] || { printf 'WSL x64 is required\n' >&2; exit 2; }
account_home=$(getent passwd "$(id -u)" | cut -d: -f6)
[[ -n "$account_home" && "$account_home" != /mnt/* ]]
export HOME=$account_home
if [[ -f "$HOME/.cargo/env" ]]; then
  source "$HOME/.cargo/env"
fi
unset T3CODE_HOME COPILOT_HOME VITE_HTTP_URL VITE_WS_URL VITE_DEV_SERVER_URL
export NODE_OPTIONS=--max-old-space-size=3072
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
for tool in curl git tar sha256sum g++ make python3 cargo rustc; do
  command -v "$tool" >/dev/null || { printf 'Missing WSL build prerequisite: %s\n' "$tool" >&2; exit 3; }
done

build_root="$HOME/.cache/t3code-v042-validation/$run_id"
[[ ! -e "$build_root" ]] || { printf 'Refusing to overwrite existing build directory %s\n' "$build_root" >&2; exit 4; }
mkdir -p "$build_root/tools"
install_node() {
  local node_version=$1
  local archive="node-v$node_version-linux-x64.tar.xz"
  curl -fsSLo "$build_root/tools/$archive" "https://nodejs.org/dist/v$node_version/$archive"
  curl -fsSLo "$build_root/tools/SHASUMS256.txt" "https://nodejs.org/dist/v$node_version/SHASUMS256.txt"
  (cd "$build_root/tools"; grep "  $archive$" SHASUMS256.txt | sha256sum -c -; tar -xJf "$archive")
}
install_node 24.19.0
install_node 26.8.2
export PATH="$build_root/tools/node-v24.19.0-linux-x64/bin:$PATH"
git clone --filter=blob:none --no-checkout "$repository" "$build_root/source"
cd "$build_root/source"
git fetch --no-tags origin "$branch"
git merge-base --is-ancestor "$expected_commit" FETCH_HEAD
git checkout --detach "$expected_commit"
[[ "$(git rev-parse HEAD)" == "$expected_commit" ]]
[[ ! -e .env && ! -e .env.local && ! -e apps/web/.env && ! -e apps/web/.env.local ]]
corepack pnpm install --frozen-lockfile --filter '@t3tools/monorepo' --filter 't3...' --filter '@t3tools/scripts...'
export PATH="$PWD/node_modules/.bin:$PATH"
node scripts/update-release-package-versions.ts "$version"
vp run --filter t3 build
cargo build --locked --release --manifest-path native/resource-monitor/Cargo.toml --target x86_64-unknown-linux-gnu
PATH="$build_root/tools/node-v26.8.2-linux-x64/bin:$PATH" node apps/server/scripts/cli.ts build-exe --verbose
mkdir -p "$build_root/resource-monitor/linux-x64"
cp native/resource-monitor/target/x86_64-unknown-linux-gnu/release/t3-resource-monitor \
  "$build_root/resource-monitor/linux-x64/t3-resource-monitor"
node scripts/build-cli-archive.ts --platform linux --arch x64 --version "$version" \
  --output-dir "$build_root/release" --resource-monitor-dir "$build_root/resource-monitor"
archive="$build_root/release/t3-$version-linux-x64.tar.gz"
node scripts/smoke-cli-archive.ts --archive "$archive" --expect-version "$version"
node "$harness/check-source.mjs" "$PWD" "$expected_commit" "$version"
mkdir -p "$(dirname "$destination")"
cp "$archive" "$destination"
sha256sum "$destination"
