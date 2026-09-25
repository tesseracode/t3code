#!/usr/bin/env bash
set -euo pipefail
case "$(uname -m)" in aarch64) arch=arm64 ;; x86_64) arch=x64 ;; *) exit 2 ;; esac
root=$(mktemp -d /tmp/t3-v042-linux-runtime.XXXXXX)
cd "$root"
cp "/input/desktop/T3-Code-0.0.42-$arch.AppImage" application.AppImage
chmod 0755 application.AppImage
./application.AppImage --appimage-extract >/dev/null
app="$root/squashfs-root"
test -x "$app/t3code"
mkdir -p /output
node /harness/backend-probe.mjs "$app/t3code" "$app/resources/app.asar/apps/server/dist/bin.mjs" /output/appimage-backend.json
mkdir -p "$root/workspace" "$root/copilot"
git -C "$root/workspace" init --quiet
ELECTRON_RUN_AS_NODE=1 "$app/t3code" /harness/copilot-probe.mjs \
  "$app/resources/app.asar/node_modules/@github/copilot-sdk/dist/cjs/index.js" \
  "$app/resources/app.asar.unpacked/node_modules/@github/copilot-linux-$arch/copilot" \
  "$root/workspace" "$root/copilot" /output/appimage-copilot-continuity.json gpt-5-mini
mkdir "$root/cli"
tar -xzf "/input/cli/t3-0.0.42-linux-$arch.tar.gz" -C "$root/cli"
node /harness/backend-probe.mjs "$root/cli/t3-0.0.42-linux-$arch/t3" - /output/cli-backend.json
