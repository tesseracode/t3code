#!/usr/bin/env bash
set -Eeuo pipefail

action=${1:?action is required}
run_id=${2:?run id is required}
port=${3:?port is required}
archive=${4:-}
expected_hash=${5:-}
install_script=${6:-}

real_home=$(getent passwd "$(id -u)" | cut -d: -f6)
if [[ -z "$real_home" || "$real_home" == /mnt/* ]]; then
  printf 'Could not resolve a native Linux account home.\n' >&2
  exit 6
fi
isolated_home="$real_home/.local/share/t3code-phase1-validation/$run_id/home"
runtime_path_file="$isolated_home/runtime.path"
runtime_root=""
if [[ -f "$runtime_path_file" ]]; then
  runtime_root=$(<"$runtime_path_file")
fi
pid_file="$isolated_home/server.pid"
start_file="$isolated_home/server.start"
log_file="$isolated_home/server.log"
export HOME=$isolated_home
unset T3CODE_HOME COPILOT_HOME

resolve_node() {
  if command -v node >/dev/null 2>&1 &&
    node -e '
      const [major, minor] = process.versions.node.split(".").map(Number);
      process.exit(major === 24 && minor >= 13 ? 0 : 1);
    ' >/dev/null 2>&1; then
    command -v node
    return
  fi
  printf '%s\n' "$real_home/.local/t3code-validation-node-v24.20.0-linux-x64/bin/node"
}

stop_server() {
  if [[ ! -f "$pid_file" ]]; then
    return
  fi
  pid=$(cat "$pid_file")
  if [[ ! "$pid" =~ ^[1-9][0-9]*$ || ! -f "$start_file" ]]; then
    printf 'Refusing to stop an unverified WSL PID record.\n' >&2
    return 7
  fi
  expected_start=$(cat "$start_file")
  process_matches() {
    [[ -n "$runtime_root" ]] || return 1
    [[ -r "/proc/$pid/stat" ]] || return 1
    [[ "$(awk '{print $22}' "/proc/$pid/stat")" == "$expected_start" ]] || return 1
    tr '\0' ' ' <"/proc/$pid/cmdline" | grep -qF -- "$runtime_root/apps/server/dist/bin.mjs"
  }
  if ! process_matches; then
    rm -f "$pid_file" "$start_file"
    return
  fi
  kill "$pid"
  for _ in $(seq 1 50); do
    if ! process_matches; then
      break
    fi
    sleep 0.1
  done
  if process_matches; then
    kill -KILL "$pid"
    for _ in $(seq 1 20); do
      if ! process_matches; then
        break
      fi
      sleep 0.1
    done
  fi
  if process_matches; then
    printf 'The verified WSL backend PID did not terminate.\n' >&2
    return 8
  fi
  rm -f "$pid_file" "$start_file"
}

start_server() {
  trap 'stop_server' ERR
  node_path=$(resolve_node)
  if [[ ! -x "$node_path" ]]; then
    printf 'Compatible WSL Node.js was not found at %s\n' "$node_path" >&2
    exit 3
  fi
  mkdir -p "$isolated_home/.local/bin"
  ln -sfn "$node_path" "$isolated_home/.local/bin/node"
  if [[ -z "$archive" || -z "$expected_hash" || -z "$install_script" ]]; then
    printf 'Archive, expected hash, and product install script are required for start/restart.\n' >&2
    exit 2
  fi
  mkdir -p "$isolated_home"
  actual_hash=$(sha256sum "$archive" | cut -d ' ' -f 1)
  if [[ "$actual_hash" != "$expected_hash" ]]; then
    printf 'WSL archive SHA-256 mismatch.\n' >&2
    exit 4
  fi
  if [[ ! -f "$install_script" ]]; then
    printf 'Product WSL runtime install script was not found at %s\n' "$install_script" >&2
    exit 2
  fi
  install_script_sha=$(sha256sum "$install_script" | cut -d ' ' -f 1)
  install_output=$(bash "$install_script")
  runtime_root=$(sed -n 's/^runtimeRoot://p' <<<"$install_output")
  expected_runtime_root="$isolated_home/.t3/wsl-runtime/sha256-$expected_hash"
  if [[ "$runtime_root" != "$expected_runtime_root" ]]; then
    printf 'Product installer returned unexpected runtime root: %s\n' "$runtime_root" >&2
    exit 5
  fi
  printf '%s\n' "$runtime_root" >"$runtime_path_file"

  test -f "$runtime_root/apps/server/dist/bin.mjs"
  test -f "$runtime_root/node_modules/node-pty/package.json"
  (
    cd "$runtime_root"
    "$node_path" -e "require('node-pty')"
  )

  stop_server
  (
    cd "$runtime_root"
    nohup "$node_path" "$runtime_root/apps/server/dist/bin.mjs" start \
      --mode desktop \
      --base-dir "$isolated_home/.t3" \
      --host 0.0.0.0 \
      --port "$port" \
      --no-browser \
      >>"$log_file" 2>&1 &
    candidate_pid=$!
    if [[ ! -r "/proc/$candidate_pid/stat" ]]; then
      printf 'The WSL backend exited before its identity could be recorded.\n' >&2
      exit 5
    fi
    printf '%s\n' "$(awk '{print $22}' "/proc/$candidate_pid/stat")" >"$start_file"
    printf '%s\n' "$candidate_pid" >"$pid_file"
  )

  pid=$(cat "$pid_file")
  ready=0
  deadline=$((SECONDS + 60))
  while ((SECONDS < deadline)); do
    if ! kill -0 "$pid" 2>/dev/null; then
      break
    fi
    if curl --connect-timeout 2 --max-time 3 -fsS "http://127.0.0.1:$port/" >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 0.5
  done
  if [[ "$ready" != 1 ]] || ! kill -0 "$pid" 2>/dev/null; then
    tail -n 80 "$log_file" >&2 || true
    exit 5
  fi

  environment_id=$(tr -d '[:space:]' <"$isolated_home/.t3/userdata/environment-id")
  server_version=$("$node_path" "$runtime_root/apps/server/dist/bin.mjs" --version)
  copilot="$runtime_root/node_modules/@github/copilot-linux-x64/copilot"
  rg="$runtime_root/node_modules/@github/copilot-linux-x64/ripgrep/bin/linux-x64/rg"
  tgrep="$runtime_root/node_modules/@github/copilot-linux-x64/tgrep/bin/linux-x64/tgrep"
  copilot_version=$("$copilot" --no-auto-update --version)
  copilot_version=${copilot_version%%$'\n'*}
  copilot_mode=$(stat -c '%a' "$copilot")
  rg_mode=$(stat -c '%a' "$rg")
  tgrep_mode=$(stat -c '%a' "$tgrep")

  printf 'pid=%s\n' "$pid"
  printf 'isolatedHome=%s\n' "$isolated_home"
  printf 'runtimeRoot=%s\n' "$runtime_root"
  printf 'stateRoot=%s\n' "$isolated_home/.t3"
  printf 'logFile=%s\n' "$log_file"
  printf 'environmentId=%s\n' "$environment_id"
  printf 'serverVersion=%s\n' "$server_version"
  printf 'copilotVersion=%s\n' "$copilot_version"
  printf 'copilotMode=%s\n' "$copilot_mode"
  printf 'rgMode=%s\n' "$rg_mode"
  printf 'tgrepMode=%s\n' "$tgrep_mode"
  printf 'installScriptSha256=%s\n' "$install_script_sha"
  printf 'nodePath=%s\n' "$node_path"
  trap - ERR
}

case "$action" in
  start)
    start_server
    ;;
  restart)
    stop_server
    start_server
    ;;
  stop)
    stop_server
    ;;
  *)
    printf 'Unknown action: %s\n' "$action" >&2
    exit 2
    ;;
esac
