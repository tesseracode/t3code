#!/usr/bin/env bash
set -euo pipefail

source_commit=${1:?frozen source commit required}
build_version=${2:-0.0.42}
case "$(uname -m)" in
  aarch64) arch=arm64; rust_target=aarch64-unknown-linux-gnu ;;
  x86_64) arch=x64; rust_target=x86_64-unknown-linux-gnu ;;
  *) printf 'Unsupported Linux build architecture\n' >&2; exit 2 ;;
esac
unset T3CODE_HOME COPILOT_HOME VITE_HTTP_URL VITE_WS_URL VITE_DEV_SERVER_URL
test ! -e /work/source
git clone --quiet --no-hardlinks --no-checkout /source-repository /work/source
cd /work/source
git checkout --quiet --detach "$source_commit"
test "$(git rev-parse HEAD)" = "$source_commit"
test ! -e .env
test ! -e .env.local
pnpm install --frozen-lockfile --filter '@t3tools/desktop...' --filter 't3...' --filter '@t3tools/scripts...'
node scripts/update-release-package-versions.ts "$build_version"
export PATH="$PWD/node_modules/.bin:$PATH"

# Same architecture-independent JS bundle reuse as the release workflow.
tar -xf /input/js-bundle.tar -C .
pnpm exec node scripts/build-desktop-artifact.ts \
  --platform linux --arch "$arch" --target AppImage --build-version "$build_version" \
  --skip-build --output-dir /output/desktop --keep-stage --verbose
PATH="/opt/node26/bin:$PATH" node apps/server/scripts/cli.ts build-exe --verbose
mkdir -p "/output/resource-monitor/linux-$arch"
cp "native/resource-monitor/target/$rust_target/release/t3-resource-monitor" \
  "/output/resource-monitor/linux-$arch/t3-resource-monitor"
node scripts/build-cli-archive.ts --platform linux --arch "$arch" \
  --version "$build_version" --output-dir /output/cli \
  --resource-monitor-dir /output/resource-monitor
node scripts/smoke-cli-archive.ts --archive "/output/cli/t3-$build_version-linux-$arch.tar.gz" \
  --expect-version "$build_version"
pnpm exec vp test run packages/shared/src/copilotRuntime.test.ts \
  apps/desktop/src/wsl/DesktopWslEnvironment.test.ts
