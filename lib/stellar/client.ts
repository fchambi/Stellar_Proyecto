import "server-only";
import {
  Account,
  BASE_FEE,
  Contract,
  Keypair,
  TransactionBuilder,
  rpc,
  scValToNative,
  type xdr,
} from "@stellar/stellar-sdk";
import { getServerConfig } from "../config";

export class StellarConfigError extends Error {}

/** Error de contrato Soroban (Error(Contract, #N)) o de simulación. */
export class ContractCallError extends Error {
  constructor(
    message: string,
    public contractCode: number | null,
  ) {
    super(message);
  }
}

export function getStellar() {
  const cfg = getServerConfig().stellar;
  if (!cfg.contractId) throw new StellarConfigError("Falta WAVO_CONTRACT_ID");
  return {
    server: new rpc.Server(cfg.rpcUrl),
    networkPassphrase: cfg.networkPassphrase,
    contractId: cfg.contractId,
    adminSecret: cfg.adminSecret,
  };
}

function adminKeypair(): Keypair {
  const secret = getServerConfig().stellar.adminSecret;
  if (!secret) throw new StellarConfigError("Falta STELLAR_ADMIN_SECRET (solo servidor, solo Testnet)");
  return Keypair.fromSecret(secret);
}

export function parseContractCode(message: string): number | null {
  const m = message.match(/Error\(Contract, #(\d+)\)/);
  return m ? Number(m[1]) : null;
}

/** Lectura vía simulación: no envía transacción ni cuesta fees. */
export async function readContract(method: string, args: xdr.ScVal[]): Promise<unknown> {
  const { server, networkPassphrase, contractId } = getStellar();
  const source = new Account(adminKeypair().publicKey(), "0");
  const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new ContractCallError(sim.error, parseContractCode(sim.error));
  }
  return sim.result ? scValToNative(sim.result.retval) : undefined;
}

export interface PreparedInvoke {
  hash: string;
  send: () => Promise<rpc.Api.SendTransactionResponse>;
}

/**
 * Construye, simula (prepareTransaction) y firma con la clave admin del servidor.
 * Devuelve el hash ANTES de enviar para poder registrarlo de forma idempotente.
 */
export async function prepareInvoke(method: string, args: xdr.ScVal[]): Promise<PreparedInvoke> {
  const { server, networkPassphrase, contractId } = getStellar();
  const kp = adminKeypair();
  const account = await server.getAccount(kp.publicKey());
  const built = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(90)
    .build();
  let prepared;
  try {
    prepared = await server.prepareTransaction(built);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new ContractCallError(msg, parseContractCode(msg));
  }
  prepared.sign(kp);
  return {
    hash: Buffer.from(prepared.hash()).toString("hex"),
    send: () => server.sendTransaction(prepared),
  };
}

export type TxOutcome =
  | { status: "SUCCESS"; ledger: number }
  | { status: "FAILED"; ledger: number }
  | { status: "NOT_FOUND" };

export async function getTxOutcome(hash: string): Promise<TxOutcome> {
  const { server } = getStellar();
  const res = await server.getTransaction(hash);
  if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) return { status: "SUCCESS", ledger: res.ledger };
  if (res.status === rpc.Api.GetTransactionStatus.FAILED) return { status: "FAILED", ledger: res.ledger };
  return { status: "NOT_FOUND" };
}

/** Espera confirmación final consultando getTransaction. */
export async function waitForTx(hash: string, attempts = 25, intervalMs = 1500): Promise<TxOutcome> {
  for (let i = 0; i < attempts; i++) {
    const out = await getTxOutcome(hash);
    if (out.status !== "NOT_FOUND") return out;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { status: "NOT_FOUND" };
}

export async function accountExists(address: string): Promise<boolean> {
  const { server } = getStellar();
  try {
    await server.getAccount(address);
    return true;
  } catch {
    return false;
  }
}
