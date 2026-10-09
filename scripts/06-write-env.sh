#!/usr/bin/env bash
# Escribe .env.local (ignorado por git) con la configuración de Testnet generada.
# ADVERTENCIA: incluye STELLAR_ADMIN_SECRET. Es una clave SOLO de Testnet para la demo;
# nunca la uses en Mainnet ni la expongas como NEXT_PUBLIC_*.
source "$(dirname "$0")/lib.sh"

ENV_FILE="$ROOT/.env.local"
CONTRACT_ID="$(require_state wavo_contract_id)"
TOKEN_ID="$(require_state token_contract_id)"
ADMIN_SECRET="$(st keys secret wavo-admin)"

existing() { [[ -f "$ENV_FILE" ]] && grep -E "^$1=" "$ENV_FILE" | head -n1 | cut -d= -f2- || true; }
ADMIN_PASSWORD="$(existing ADMIN_PASSWORD)"
SESSION_SECRET="$(existing ADMIN_SESSION_SECRET)"
SUPABASE_URL="$(existing SUPABASE_URL)"
SUPABASE_KEY="$(existing SUPABASE_SERVICE_ROLE_KEY)"
DEMO_CAMPAIGN="$(existing DEMO_ONCHAIN_CAMPAIGN_ID)"
[[ -n "$DEMO_CAMPAIGN" ]] || DEMO_CAMPAIGN=3
[[ -n "$ADMIN_PASSWORD" ]] || ADMIN_PASSWORD="$(node -e 'console.log(require("crypto").randomBytes(9).toString("base64url"))')"
[[ -n "$SESSION_SECRET" ]] || SESSION_SECRET="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"

cat > "$ENV_FILE" <<EOF
# Generado por scripts/06-write-env.sh — NO subir a git.
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
WAVO_CONTRACT_ID=$CONTRACT_ID
TOKEN_CONTRACT_ID=$TOKEN_ID
TOKEN_SYMBOL=XLM
TOKEN_DECIMALS=7
# Clave admin SOLO Testnet (firma distribute_reward en el servidor).
STELLAR_ADMIN_SECRET=$ADMIN_SECRET
ADMIN_PASSWORD=$ADMIN_PASSWORD
ADMIN_SESSION_SECRET=$SESSION_SECRET
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_KEY
# Campaña on-chain (scripts/04) a la que se vincula la campaña demo del seed.
DEMO_ONCHAIN_CAMPAIGN_ID=$DEMO_CAMPAIGN
EOF

echo ".env.local escrito. Contraseña admin: $ADMIN_PASSWORD"
