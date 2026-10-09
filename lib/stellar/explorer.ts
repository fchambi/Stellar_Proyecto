const BASE = "https://stellar.expert/explorer/testnet";

export const explorerTx = (hash: string) => `${BASE}/tx/${hash}`;
export const explorerContract = (id: string) => `${BASE}/contract/${id}`;
export const explorerAccount = (address: string) => `${BASE}/account/${address}`;
export const friendbotUrl = (address: string) =>
  `https://friendbot.stellar.org/?addr=${encodeURIComponent(address)}`;

export function shortAddress(value: string, size = 4): string {
  return value.length <= size * 2 + 1 ? value : `${value.slice(0, size)}…${value.slice(-size)}`;
}
