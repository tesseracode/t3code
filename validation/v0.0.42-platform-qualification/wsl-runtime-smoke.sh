#!/usr/bin/env bash
set -Eeuo pipefail
trap 'printf "WSL helper failed at line %s\n" "$LINENO" >&2' ERR

action=${1:?action required}
run_id=${2:?run ID required}
port=${3:?port required}
[[ "$run_id" =~ ^[A-Za-z0-9-]+$ && "$port" =~ ^[0-9]+$ ]]
case "$(uname -m)" in x86_64) arch=x64 ;; aarch64|arm64) arch=arm64 ;; *) exit 2 ;; esac
real_home=$(getent passwd "$(id -u)" | cut -d: -f6)
[[ -n "$real_home" && "$real_home" != /mnt/* ]]
isolated_home="$real_home/.local/share/t3code-v042-validation/$run_id/home"
export HOME=$isolated_home
unset T3CODE_HOME COPILOT_HOME
runtime_path_file="$isolated_home/runtime.path"
pid_file="$isolated_home/server.pid"
start_file="$isolated_home/server.start"
runtime_root=""
if [[ -f "$runtime_path_file" ]]; then runtime_root=$(<"$runtime_path_file"); fi

stop_server() {
  [[ -f "$pid_file" ]] || return 0
  local pid expected_start
  pid=$(<"$pid_file")
  [[ "$pid" =~ ^[1-9][0-9]*$ && -f "$start_file" ]] || { printf 'Unverified PID record\n' >&2; return 7; }
  expected_start=$(<"$start_file")
  [[ -r "/proc/$pid/stat" ]] || { rm "$pid_file" "$start_file"; return 0; }
  [[ "$(awk '{print $22}' "/proc/$pid/stat")" == "$expected_start" ]] || { printf 'Recorded PID has been reused\n' >&2; return 7; }
  if [[ "$(awk '{print $3}' "/proc/$pid/stat")" == Z ]]; then rm "$pid_file" "$start_file"; return 0; fi
  [[ "$(readlink "/proc/$pid/exe")" == "$runtime_root/t3" ]] || { printf 'Recorded process is not the owned runtime\n' >&2; return 7; }
  kill -TERM "$pid"
  for _ in $(seq 1 100); do
    if [[ ! -r "/proc/$pid/stat" ]]; then rm "$pid_file" "$start_file"; return 0; fi
    if [[ "$(awk '{print $22}' "/proc/$pid/stat")" != "$expected_start" ]]; then
      printf 'PID changed during cleanup\n' >&2
      return 7
    fi
    if [[ "$(awk '{print $3}' "/proc/$pid/stat")" == Z ]]; then rm "$pid_file" "$start_file"; return 0; fi
    sleep 0.1
  done
  printf 'Owned backend did not stop gracefully\n' >&2
  return 8
}

case "$action" in
  prepare)
    archive=${4:?archive required}
    expected_hash=${5:?archive hash required}
    install_script=${6:?production installer required}
    mkdir -p "$isolated_home"
    [[ "$(sha256sum "$archive" | cut -d ' ' -f 1)" == "$expected_hash" ]]
    install_output=$(bash "$install_script")
    runtime_root=$(sed -n 's/^runtimeRoot://p' <<<"$install_output")
    [[ "$runtime_root" == "$isolated_home/.t3/wsl-runtime/sha256-$expected_hash" ]]
    [[ -x "$runtime_root/t3" ]]
    printf '%s\n' "$runtime_root" >"$runtime_path_file"
    sha256sum "$install_script" | cut -d ' ' -f 1 >"$isolated_home/installer.sha256"
    printf 'runtimeRoot=%s\n' "$runtime_root"
    ;;
  serve)
    [[ -n "$runtime_root" && -x "$runtime_root/t3" ]]
    [[ ! -f "$pid_file" ]] || { printf 'An owned backend PID record already exists\n' >&2; exit 7; }
    printf '%s\n' "$$" >"$pid_file"
    awk '{print $22}' "/proc/$$/stat" >"$start_file"
    cd "$runtime_root"
    exec "$runtime_root/t3" serve --mode desktop --base-dir "$isolated_home/.t3" \
      --host 0.0.0.0 --port "$port" --no-browser
    ;;
  metadata)
    [[ -n "$runtime_root" && -f "$isolated_home/.t3/userdata/environment-id" ]]
    pid=$(cat "$pid_file")
    [[ "$pid" =~ ^[1-9][0-9]*$ && -r "/proc/$pid/stat" ]]
    [[ "$(awk '{print $22}' "/proc/$pid/stat")" == "$(cat "$start_file")" ]]
    [[ "$(awk '{print $3}' "/proc/$pid/stat")" != Z ]]
    [[ "$(readlink "/proc/$pid/exe")" == "$runtime_root/t3" ]]
    printf 'pid=%s\n' "$pid"
    printf 'isolatedHome=%s\nruntimeRoot=%s\nstateRoot=%s\n' "$isolated_home" "$runtime_root" "$isolated_home/.t3"
    printf 'environmentId=%s\n' "$(tr -d '[:space:]' <"$isolated_home/.t3/userdata/environment-id")"
    printf 'serverVersion=%s\n' "$("$runtime_root/t3" --version)"
    printf 'installScriptSha256=%s\n' "$(cat "$isolated_home/installer.sha256")"
    for tool in copilot rg tgrep; do
      case "$tool" in
        copilot) executable="$runtime_root/node_modules/@github/copilot-linux-$arch/copilot" ;;
        rg) executable="$runtime_root/node_modules/@github/copilot-linux-$arch/ripgrep/bin/linux-$arch/rg" ;;
        tgrep) executable="$runtime_root/node_modules/@github/copilot-linux-$arch/tgrep/bin/linux-$arch/tgrep" ;;
      esac
      [[ -x "$executable" ]]
      printf '%sMode=%s\n' "$tool" "$(stat -c '%a' "$executable")"
    done
    ;;
  stop) stop_server ;;
  *) printf 'Unknown action: %s\n' "$action" >&2; exit 2 ;;
esac
