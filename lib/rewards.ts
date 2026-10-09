import { sumBigInt } from "./money";
import {
  COMMITTED_STATUSES,
  RESERVED_STATUSES,
  type Campaign,
  type RewardDistribution,
} from "./types";

export type RewardBlockReason = "no_new_views" | "max_reward_reached" | "insufficient_budget";

export interface RewardInput {
  verifiedViews: number;
  rewardedViews: number;
  /** Unidades mínimas por cada 1000 vistas. */
  cpm: bigint;
  /** Tope por creador (0 = sin tope). */
  maxReward: bigint;
  /** Lo ya reservado o pagado a este creador en la campaña. */
  creatorCommitted: bigint;
  /** Presupuesto disponible de la campaña (presupuesto - reservado - pagado). */
  campaignAvailable: bigint;
}

export interface RewardResult {
  ok: boolean;
  reason?: RewardBlockReason;
  deltaViews: number;
  /** floor(delta * cpm / 1000) antes de topes. */
  grossAmount: bigint;
  /** Monto final tras aplicar el tope por creador. */
  amount: bigint;
  cappedByMaxReward: boolean;
}

export const REWARD_BLOCK_MESSAGES: Record<RewardBlockReason, string> = {
  no_new_views: "No hay vistas nuevas verificadas desde el último pago.",
  max_reward_reached: "El creador ya alcanzó el máximo por creador de esta campaña.",
  insufficient_budget:
    "Presupuesto disponible insuficiente para esta recompensa. Aprobación bloqueada (no se prorratea).",
};

/**
 * reward = floor(delta_verified_views * cpm / 1000), limitado por el máximo por creador.
 * Si el resultado excede el disponible de la campaña se bloquea: nunca se prorratea.
 */
export function computeReward(input: RewardInput): RewardResult {
  const delta = input.verifiedViews - input.rewardedViews;
  if (!Number.isSafeInteger(input.verifiedViews) || !Number.isSafeInteger(input.rewardedViews)) {
    throw new Error("Vistas fuera de rango");
  }
  if (input.cpm <= 0n) throw new Error("CPM debe ser positivo");

  const base: RewardResult = {
    ok: false,
    deltaViews: Math.max(delta, 0),
    grossAmount: 0n,
    amount: 0n,
    cappedByMaxReward: false,
  };
  if (delta <= 0) return { ...base, reason: "no_new_views" };

  const gross = (BigInt(delta) * input.cpm) / 1000n;
  let amount = gross;
  let capped = false;
  if (input.maxReward > 0n) {
    const remaining = input.maxReward - input.creatorCommitted;
    if (remaining <= 0n) {
      return { ...base, grossAmount: gross, reason: "max_reward_reached" };
    }
    if (amount > remaining) {
      amount = remaining;
      capped = true;
    }
  }
  if (amount <= 0n) return { ...base, grossAmount: gross, reason: "no_new_views" };

  if (amount > input.campaignAvailable) {
    return { ...base, grossAmount: gross, amount, cappedByMaxReward: capped, reason: "insufficient_budget" };
  }
  return { ok: true, deltaViews: delta, grossAmount: gross, amount, cappedByMaxReward: capped };
}

export interface CampaignTotals {
  budget: bigint;
  reserved: bigint;
  paid: bigint;
  available: bigint;
}

export function campaignTotals(
  campaign: Pick<Campaign, "budget">,
  distributions: Pick<RewardDistribution, "status" | "amount">[],
): CampaignTotals {
  const reserved = sumBigInt(
    distributions.filter((d) => RESERVED_STATUSES.includes(d.status)).map((d) => d.amount),
  );
  const paid = sumBigInt(distributions.filter((d) => d.status === "paid").map((d) => d.amount));
  return { budget: campaign.budget, reserved, paid, available: campaign.budget - reserved - paid };
}

export function committedAmount(distributions: Pick<RewardDistribution, "status" | "amount">[]): bigint {
  return sumBigInt(
    distributions.filter((d) => COMMITTED_STATUSES.includes(d.status)).map((d) => d.amount),
  );
}

/** Estimación (no compromete fondos): lo que se pagaría hoy con las vistas verificadas. */
export function estimateReward(verifiedViews: number, rewardedViews: number, cpm: bigint): bigint {
  const delta = verifiedViews - rewardedViews;
  return delta > 0 ? (BigInt(delta) * cpm) / 1000n : 0n;
}
