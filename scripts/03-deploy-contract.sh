#!/usr/bin/env bash
# Compila, prueba, despliega e inicializa WavoRewards en Testnet.
source "$(dirname "$0")/lib.sh"

TOKEN_ID="$(require_state token_contract_id)"
ADMIN="$(addr wavo-admin)"

echo "• cargo test"
(cd "$CONTRACT_DIR" && cargo test --quiet)

echo "• stellar contract build"
(cd "$CONTRACT_DIR" && st contract build)

echo "• desplegando"
CONTRACT_ID="$(run_logged deploy st contract deploy \
  --wasm "$WASM" \
  --source-account wavo-admin \
  --network "$NETWORK" \
  --alias wavo_rewards)"
state_set wavo_contract_id "$CONTRACT_ID"
state_set deploy_tx "$(tx_hash_from_log deploy)"
echo "WAVO_CONTRACT_ID=$CONTRACT_ID"

# Inicializar en el mismo script reduce la ventana de front-running de initialize.
echo "• initialize(admin, token)"
run_logged initialize st contract invoke \
  --id "$CONTRACT_ID" \
  --source-account wavo-admin \
  --network "$NETWORK" \
  -- initialize --admin "$ADMIN" --token "$TOKEN_ID"
state_set initialize_tx "$(tx_hash_from_log initialize)"

echo "https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
