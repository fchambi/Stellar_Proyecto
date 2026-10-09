#!/usr/bin/env bash
# Token de la demo: XLM nativo de Testnet a través de su Stellar Asset Contract (SAC).
# No requiere trustlines: cualquier cuenta de Testnet fondeada puede recibir pagos.
source "$(dirname "$0")/lib.sh"

TOKEN_ID="$(st contract id asset --asset native --network "$NETWORK")"

# En Testnet el SAC nativo normalmente ya está desplegado; si no, se despliega.
if ! st contract asset deploy --asset native --source-account wavo-admin --network "$NETWORK" >/dev/null 2>&1; then
  echo "• SAC nativo ya desplegado (esperado en Testnet)"
fi

state_set token_contract_id "$TOKEN_ID"
state_set token_symbol "XLM"
echo "TOKEN_CONTRACT_ID=$TOKEN_ID"
echo "https://stellar.expert/explorer/testnet/contract/$TOKEN_ID"
