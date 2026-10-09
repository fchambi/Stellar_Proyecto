#!/usr/bin/env bash
# Payout directo vía CLI (sin la app), firmado por el admin.
# Uso: scripts/05-payout-cli.sh <campaign_id> <recipient_identity_or_G...> <amount_stroops> [reward_label]
# El reward_id es sha256(reward_label): repetir el mismo label demuestra la protección contra doble pago.
source "$(dirname "$0")/lib.sh"

CAMPAIGN_ID="$1"
RECIPIENT="$2"
AMOUNT="$3"
LABEL="${4:-cli:$CAMPAIGN_ID:$RECIPIENT:$AMOUNT}"
CONTRACT_ID="$(require_state wavo_contract_id)"
[[ "$RECIPIENT" == G* ]] || RECIPIENT="$(addr "$RECIPIENT")"
REWARD_ID="$(printf '%s' "$LABEL" | shasum -a 256 | cut -d' ' -f1)"

echo "• distribute_reward(campaign=$CAMPAIGN_ID, reward_id=$REWARD_ID, to=$RECIPIENT, amount=$AMOUNT)"
run_logged "payout_${REWARD_ID:0:12}" st contract invoke \
  --id "$CONTRACT_ID" --source-account wavo-admin --network "$NETWORK" \
  -- distribute_reward --campaign_id "$CAMPAIGN_ID" --reward_id "$REWARD_ID" --recipient "$RECIPIENT" --amount "$AMOUNT"
HASH="$(tx_hash_from_log "payout_${REWARD_ID:0:12}")"
state_set "cli_payout_${REWARD_ID:0:12}_tx" "$HASH"
echo "https://stellar.expert/explorer/testnet/tx/$HASH"
