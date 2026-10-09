import "server-only";
import { Address, nativeToScVal } from "@stellar/stellar-sdk";
import { ContractCallError, prepareInvoke, readContract } from "./client";

/** Códigos de `contracts/wavo_rewards/src/lib.rs` (enum Error). */
export const CONTRACT_ERRORS: Record<number, string> = {
  1: "Contrato ya inicializado",
  2: "Contrato no inicializado",
  3: "No autorizado",
  4: "La campaña on-chain ya existe",
  5: "Campaña on-chain no encontrada",
  6: "Campaña on-chain cerrada",
  7: "Monto inválido",
  8: "Fondos insuficientes en el contrato para esta campaña",
  9: "Esta recompensa ya fue pagada (reward_id duplicado)",
  10: "Esta recompensa ya está reservada on-chain",
  11: "Recompensa no encontrada",
  12: "La recompensa no coincide con la reserva",
  13: "Supera el presupuesto de la campaña",
  14: "Desbordamiento aritmético",
};

export function describeContractError(e: unknown): string {
  if (e instanceof ContractCallError && e.contractCode !== null) {
    return CONTRACT_ERRORS[e.contractCode] ?? `Error de contrato #${e.contractCode}`;
  }
  return e instanceof Error ? e.message : String(e);
}

const u64 = (v: string | bigint) => nativeToScVal(BigInt(v), { type: "u64" });
const i128 = (v: bigint) => nativeToScVal(v, { type: "i128" });
const bytes32 = (hex: string) => {
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error("reward_id debe ser 32 bytes hex");
  return nativeToScVal(Buffer.from(hex, "hex"));
};

export interface OnchainCampaign {
  owner: string;
  cpm: bigint;
  budget: bigint;
  funded: bigint;
  reserved: bigint;
  paid: bigint;
  refunded: bigint;
  closed: boolean;
  available: bigint;
}

export async function getOnchainCampaign(campaignId: string): Promise<OnchainCampaign> {
  const raw = (await readContract("get_campaign", [u64(campaignId)])) as Record<string, unknown>;
  const n = (k: string) => BigInt(raw[k] as bigint);
  const c = {
    owner: String(raw.owner),
    cpm: n("cpm"),
    budget: n("budget"),
    funded: n("funded"),
    reserved: n("reserved"),
    paid: n("paid"),
    refunded: n("refunded"),
    closed: Boolean(raw.closed),
  };
  return { ...c, available: c.funded - c.paid - c.refunded - c.reserved };
}

export async function getOnchainRewardStatus(rewardId: string): Promise<"Paid" | "Reserved" | null> {
  const raw = (await readContract("get_reward", [bytes32(rewardId)])) as
    | { status: unknown }
    | null
    | undefined;
  if (!raw) return null;
  const s = Array.isArray(raw.status) ? raw.status[0] : raw.status;
  return s === "Paid" || s === "Reserved" ? s : null;
}

export function prepareDistribute(args: {
  campaignId: string;
  rewardId: string;
  recipient: string;
  amount: bigint;
}) {
  return prepareInvoke("distribute_reward", [
    u64(args.campaignId),
    bytes32(args.rewardId),
    new Address(args.recipient).toScVal(),
    i128(args.amount),
  ]);
}
