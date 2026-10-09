#!/usr/bin/env bash
# La marca crea la campaña on-chain y la financia.
# Uso: scripts/04-create-and-fund.sh [campaign_id=1] [budget_stroops=1000000000] [cpm_stroops=20000000]
# Por defecto: 100 XLM de presupuesto, CPM 2 XLM (1 XLM = 10^7 stroops).
source "$(dirname "$0")/lib.sh"

CAMPAIGN_ID="${1:-1}"
BUDGET="${2:-1000000000}"
CPM="${3:-20000000}"
CONTRACT_ID="$(require_state wavo_contract_id)"
BRAND="$(addr wavo-brand)"

echo "• create_campaign($CAMPAIGN_ID, cpm=$CPM, budget=$BUDGET)"
run_logged "create_$CAMPAIGN_ID" st contract invoke \
  --id "$CONTRACT_ID" --source-account wavo-brand --network "$NETWORK" \
  -- create_campaign --campaign_id "$CAMPAIGN_ID" --owner "$BRAND" --cpm "$CPM" --budget "$BUDGET"
state_set "campaign_${CAMPAIGN_ID}_create_tx" "$(tx_hash_from_log "create_$CAMPAIGN_ID")"

echo "• fund_campaign($CAMPAIGN_ID, $BUDGET)"
run_logged "fund_$CAMPAIGN_ID" st contract invoke \
  --id "$CONTRACT_ID" --source-account wavo-brand --network "$NETWORK" \
  -- fund_campaign --campaign_id "$CAMPAIGN_ID" --from "$BRAND" --amount "$BUDGET"
state_set "campaign_${CAMPAIGN_ID}_fund_tx" "$(tx_hash_from_log "fund_$CAMPAIGN_ID")"

echo "• get_campaign($CAMPAIGN_ID)"
st contract invoke --id "$CONTRACT_ID" --source-account wavo-admin --network "$NETWORK" --send=no \
  -- get_campaign --campaign_id "$CAMPAIGN_ID"
