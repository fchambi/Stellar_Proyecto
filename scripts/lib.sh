#!/usr/bin/env bash
# Utilidades comunes para los scripts de Testnet de Wavo.
# Las identidades se guardan en ./.stellar-keys (ignorado por git), no en tu config global.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CFG="$ROOT/.stellar-keys"
STATE="$ROOT/.stellar-deploy.json"
NETWORK="testnet"
CONTRACT_DIR="$ROOT/contracts/wavo_rewards"
export CARGO_TARGET_DIR="$CONTRACT_DIR/target"
WASM="$CARGO_TARGET_DIR/wasm32v1-none/release/wavo_rewards.wasm"
LOG_DIR="$ROOT/.stellar-logs"
mkdir -p "$CFG" "$LOG_DIR"

st() { stellar --config-dir "$CFG" "$@"; }

addr() { st keys address "$1"; }

# state_set clave valor  -> guarda en .stellar-deploy.json
state_set() {
  node -e '
    const fs = require("fs");
    const [file, key, value] = process.argv.slice(1);
    const s = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
    s[key] = value;
    s.updated_at = new Date().toISOString();
    fs.writeFileSync(file, JSON.stringify(s, null, 2) + "\n");
  ' "$STATE" "$1" "$2"
}

state_get() {
  node -e '
    const fs = require("fs");
    const [file, key] = process.argv.slice(1);
    if (!fs.existsSync(file)) process.exit(0);
    const v = JSON.parse(fs.readFileSync(file, "utf8"))[key];
    if (v !== undefined) process.stdout.write(String(v));
  ' "$STATE" "$1"
}

require_state() {
  local v
  v="$(state_get "$1")"
  if [[ -z "$v" ]]; then
    echo "Falta '$1' en $STATE. Ejecuta los scripts anteriores." >&2
    exit 1
  fi
  printf '%s' "$v"
}

# Ejecuta un comando guardando stderr (logs del CLI con hashes de tx) en un archivo.
run_logged() {
  local name="$1"; shift
  local log="$LOG_DIR/$name.log"
  local status=0
  "$@" 2>"$log" || status=$?
  cat "$log" >&2
  return "$status"
}

# Hash de la última transacción firmada en el log (en deploy: la tx de despliegue, no la de subida del WASM).
tx_hash_from_log() {
  grep 'Signing transaction' "$LOG_DIR/$1.log" | grep -Eo '[0-9a-f]{64}' | tail -n1 || true
}
