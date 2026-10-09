#!/usr/bin/env bash
# Crea y fondea (Friendbot) las cuentas demo en Testnet: admin, marca y dos creadores.
source "$(dirname "$0")/lib.sh"

for name in wavo-admin wavo-brand wavo-creator1 wavo-creator2; do
  if st keys address "$name" >/dev/null 2>&1; then
    echo "• $name ya existe: $(addr "$name")"
    st keys fund "$name" --network "$NETWORK" >/dev/null 2>&1 || true
  else
    st keys generate "$name" --network "$NETWORK" --fund
    echo "• $name creado y fondeado: $(addr "$name")"
  fi
  state_set "$name" "$(addr "$name")"
done

echo
echo "Cuentas listas (Testnet). Explorer:"
for name in wavo-admin wavo-brand wavo-creator1 wavo-creator2; do
  echo "  $name  https://stellar.expert/explorer/testnet/account/$(addr "$name")"
done
