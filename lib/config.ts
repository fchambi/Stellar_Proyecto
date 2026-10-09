import "server-only";

export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

export interface ServerConfig {
  supabase: { url: string; serviceRoleKey: string } | null;
  stellar: {
    rpcUrl: string;
    networkPassphrase: string;
    contractId: string | null;
    tokenContractId: string | null;
    adminSecret: string | null;
  };
  token: { symbol: string; decimals: number };
  admin: { password: string | null; sessionSecret: string | null };
}

const env = (k: string) => {
  const v = process.env[k]?.trim();
  return v ? v : null;
};

export function getServerConfig(): ServerConfig {
  const network = env("STELLAR_NETWORK") ?? "testnet";
  if (network !== "testnet") {
    throw new Error("Wavo MVP solo soporta STELLAR_NETWORK=testnet");
  }
  const sbUrl = env("SUPABASE_URL");
  const sbKey = env("SUPABASE_SERVICE_ROLE_KEY");
  return {
    supabase: sbUrl && sbKey ? { url: sbUrl, serviceRoleKey: sbKey } : null,
    stellar: {
      rpcUrl: env("STELLAR_RPC_URL") ?? "https://soroban-testnet.stellar.org",
      networkPassphrase: TESTNET_PASSPHRASE,
      contractId: env("WAVO_CONTRACT_ID"),
      tokenContractId: env("TOKEN_CONTRACT_ID"),
      adminSecret: env("STELLAR_ADMIN_SECRET"),
    },
    token: {
      symbol: env("TOKEN_SYMBOL") ?? "XLM",
      decimals: Number(env("TOKEN_DECIMALS") ?? 7),
    },
    admin: { password: env("ADMIN_PASSWORD"), sessionSecret: env("ADMIN_SESSION_SECRET") },
  };
}

export function isStellarReady(cfg = getServerConfig()): boolean {
  return Boolean(cfg.stellar.contractId && cfg.stellar.adminSecret);
}

/** Información no sensible que se puede mostrar en la UI. */
export interface PublicStatus {
  dataMode: "supabase" | "memory";
  stellarReady: boolean;
  contractId: string | null;
  tokenContractId: string | null;
  tokenSymbol: string;
  network: "testnet";
}

export function getPublicStatus(): PublicStatus {
  const cfg = getServerConfig();
  return {
    dataMode: cfg.supabase ? "supabase" : "memory",
    stellarReady: isStellarReady(cfg),
    contractId: cfg.stellar.contractId,
    tokenContractId: cfg.stellar.tokenContractId,
    tokenSymbol: cfg.token.symbol,
    network: "testnet",
  };
}
