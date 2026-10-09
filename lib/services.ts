import "server-only";
import { createHash } from "node:crypto";
import { getServerConfig, isStellarReady } from "./config";
import { ServiceError } from "./http";
import { formatUnits, parseUnits } from "./money";
import { getRepo } from "./repo";
import {
  REWARD_BLOCK_MESSAGES,
  campaignTotals,
  committedAmount,
  computeReward,
  estimateReward,
  type CampaignTotals,
} from "./rewards";
import { accountExists, getTxOutcome, waitForTx } from "./stellar/client";
import {
  describeContractError,
  getOnchainCampaign,
  getOnchainRewardStatus,
  prepareDistribute,
  type OnchainCampaign,
} from "./stellar/wavo";
import type {
  Campaign,
  CampaignStatus,
  Participant,
  RewardDistribution,
  Submission,
} from "./types";
import { detectPlatform } from "./validation";

/* ------------------------------------------------------------------ lecturas */

export interface CampaignView {
  campaign: Campaign;
  totals: CampaignTotals;
  participants: Participant[];
  submissions: Submission[];
  distributions: RewardDistribution[];
}

export async function listCampaignViews(): Promise<CampaignView[]> {
  const repo = getRepo();
  const [campaigns, participants, submissions, distributions] = await Promise.all([
    repo.listCampaigns(),
    repo.listParticipants(),
    repo.listSubmissions(),
    repo.listDistributions(),
  ]);
  return campaigns.map((campaign) => {
    const dists = distributions.filter((d) => d.campaign_id === campaign.id);
    return {
      campaign,
      totals: campaignTotals(campaign, dists),
      participants: participants.filter((p) => p.campaign_id === campaign.id),
      submissions: submissions.filter((s) => s.campaign_id === campaign.id),
      distributions: dists,
    };
  });
}

export async function getCampaignView(id: string): Promise<CampaignView | null> {
  const repo = getRepo();
  const campaign = await repo.getCampaign(id);
  if (!campaign) return null;
  const [participants, submissions, distributions] = await Promise.all([
    repo.listParticipants(id),
    repo.listSubmissions(id),
    repo.listDistributions(id),
  ]);
  return {
    campaign,
    totals: campaignTotals(campaign, distributions),
    participants,
    submissions,
    distributions,
  };
}

/** Estado on-chain de la campaña; null si no está vinculada o Stellar no está configurado. */
export async function getOnchainSafe(
  campaign: Campaign,
): Promise<{ data: OnchainCampaign | null; error: string | null }> {
  if (!campaign.contract_campaign_id || !isStellarReady()) return { data: null, error: null };
  try {
    return { data: await getOnchainCampaign(campaign.contract_campaign_id), error: null };
  } catch (e) {
    return { data: null, error: describeContractError(e) };
  }
}

/* ------------------------------------------------------------------ marca / creador */

export async function createCampaign(input: {
  title: string;
  description: string;
  brand_name: string;
  platform: Campaign["platform"];
  rules: string;
  budget: string;
  cpm: string;
  max_reward: string;
}): Promise<Campaign> {
  const budget = parseUnits(input.budget);
  const cpm = parseUnits(input.cpm);
  const maxReward = parseUnits(input.max_reward);
  if (budget <= 0n) throw new ServiceError(400, "El presupuesto debe ser mayor a 0");
  if (cpm <= 0n) throw new ServiceError(400, "El CPM debe ser mayor a 0");
  if (maxReward > budget) throw new ServiceError(400, "El máximo por creador no puede superar el presupuesto");
  return getRepo().createCampaign({
    title: input.title,
    description: input.description,
    brand_name: input.brand_name,
    platform: input.platform,
    rules: input.rules,
    budget,
    cpm,
    max_reward: maxReward,
    token_address: getServerConfig().stellar.tokenContractId,
  });
}

async function activeCampaign(id: string): Promise<Campaign> {
  const c = await getRepo().getCampaign(id);
  if (!c) throw new ServiceError(404, "Campaña no encontrada");
  if (c.status !== "active") throw new ServiceError(422, "La campaña no está activa");
  return c;
}

export async function joinCampaign(campaignId: string, displayName: string, address: string) {
  await activeCampaign(campaignId);
  const repo = getRepo();
  const existing = await repo.findParticipant(campaignId, address);
  if (existing) return { participant: existing, alreadyJoined: true };
  const participant = await repo.createParticipant({
    campaign_id: campaignId,
    display_name: displayName,
    stellar_address: address,
  });
  return { participant, alreadyJoined: false };
}

export async function submitContent(campaignId: string, address: string, contentUrl: string) {
  const campaign = await activeCampaign(campaignId);
  const repo = getRepo();
  const participant = await repo.findParticipant(campaignId, address);
  if (!participant) {
    throw new ServiceError(422, "Primero regístrate en la campaña con esta dirección Stellar");
  }
  const platform = detectPlatform(contentUrl);
  if (!platform) throw new ServiceError(400, "La URL debe ser https de TikTok, Instagram o YouTube");
  if (campaign.platform !== "any" && campaign.platform !== platform) {
    throw new ServiceError(422, `Esta campaña solo acepta contenido de ${campaign.platform}`);
  }
  return repo.createSubmission({
    campaign_id: campaignId,
    participant_id: participant.id,
    content_url: contentUrl,
    platform,
  });
}

/* ------------------------------------------------------------------ admin */

async function loadSubmission(id: string) {
  const repo = getRepo();
  const sub = await repo.getSubmission(id);
  if (!sub) throw new ServiceError(404, "Envío no encontrado");
  const campaign = await repo.getCampaign(sub.campaign_id);
  if (!campaign) throw new ServiceError(404, "Campaña no encontrada");
  return { sub, campaign };
}

/** Registro manual de vistas verificadas (sin oracle de redes sociales). */
export async function setVerifiedViews(submissionId: string, views: number) {
  const { sub, campaign } = await loadSubmission(submissionId);
  if (sub.status === "rejected") throw new ServiceError(409, "El envío fue rechazado");
  if (views < sub.rewarded_views) {
    throw new ServiceError(
      422,
      `Las vistas verificadas no pueden ser menores a las ya recompensadas (${sub.rewarded_views})`,
    );
  }
  const pending = estimateReward(views, sub.rewarded_views, campaign.cpm);
  const status = views > sub.rewarded_views ? "verified" : sub.status === "pending" ? "pending" : sub.status;
  return getRepo().updateSubmission(submissionId, {
    verified_views: views,
    pending_reward: pending,
    status,
  });
}

export async function rejectSubmission(submissionId: string) {
  const { sub } = await loadSubmission(submissionId);
  const dists = (await getRepo().listDistributions(sub.campaign_id)).filter(
    (d) => d.submission_id === sub.id && ["reserved", "submitted", "failed"].includes(d.status),
  );
  if (dists.length > 0) {
    throw new ServiceError(409, "Libera o paga primero las recompensas reservadas de este envío");
  }
  return getRepo().updateSubmission(submissionId, { status: "rejected", pending_reward: 0n });
}

/** Determinista por (campaña on-chain, envío, snapshot de vistas): mismo snapshot => mismo reward_id. */
export function rewardIdFor(
  sub: Pick<Submission, "id" | "rewarded_views" | "verified_views">,
  contractCampaignId: string | null,
): string {
  return createHash("sha256")
    .update(`wavo:${contractCampaignId ?? "offchain"}:${sub.id}:${sub.rewarded_views}:${sub.verified_views}`)
    .digest("hex");
}

/**
 * Validación off-chain + reserva. No mueve fondos: el pago on-chain es un paso separado.
 * Idempotente: el reward_id deriva del snapshot de vistas.
 */
export async function approveSubmission(submissionId: string) {
  const { sub, campaign } = await loadSubmission(submissionId);
  if (sub.status === "rejected") throw new ServiceError(409, "El envío fue rechazado");
  if (campaign.status !== "active") throw new ServiceError(422, "La campaña no está activa");

  const repo = getRepo();
  const dists = await repo.listDistributions(campaign.id);
  const rewardId = rewardIdFor(sub, campaign.contract_campaign_id);
  const existing = dists.find((d) => d.reward_id === rewardId);
  if (existing) return { distribution: existing, idempotent: true };

  const totals = campaignTotals(campaign, dists);
  const calc = computeReward({
    verifiedViews: sub.verified_views,
    rewardedViews: sub.rewarded_views,
    cpm: campaign.cpm,
    maxReward: campaign.max_reward,
    creatorCommitted: committedAmount(dists.filter((d) => d.participant_id === sub.participant_id)),
    campaignAvailable: totals.available,
  });
  if (!calc.ok) {
    const extra =
      calc.reason === "insufficient_budget"
        ? ` Requiere ${formatUnits(calc.amount)}, disponible ${formatUnits(totals.available)}.`
        : "";
    throw new ServiceError(422, REWARD_BLOCK_MESSAGES[calc.reason!] + extra);
  }

  if (isStellarReady()) {
    if (!campaign.contract_campaign_id) {
      throw new ServiceError(422, "Vincula la campaña a su ID on-chain financiado antes de aprobar.");
    }
    const onchain = await getOnchainCampaign(campaign.contract_campaign_id).catch((e) => {
      throw new ServiceError(502, `No se pudo leer el contrato: ${describeContractError(e)}`);
    });
    if (onchain.closed) throw new ServiceError(422, "La campaña on-chain está cerrada");
    const free = onchain.available - totals.reserved;
    if (free < calc.amount) {
      throw new ServiceError(
        422,
        `Fondos on-chain insuficientes: disponible ${formatUnits(onchain.available)}, ya reservado off-chain ${formatUnits(totals.reserved)}, requerido ${formatUnits(calc.amount)}. Aprobación bloqueada.`,
      );
    }
  }

  const distribution = await repo.reserveReward({
    submission_id: sub.id,
    reward_id: rewardId,
    amount: calc.amount,
    views_from: sub.rewarded_views,
    views_to: sub.verified_views,
  });
  return { distribution, idempotent: false, cappedByMaxReward: calc.cappedByMaxReward };
}

export async function cancelDistribution(distributionId: string) {
  return getRepo().cancelReward(distributionId);
}

async function markPaid(d: RewardDistribution): Promise<RewardDistribution> {
  const repo = getRepo();
  const paid = await repo.transitionDistribution(d.id, ["submitted", "failed"], {
    status: "paid",
    error: null,
  });
  if (!paid) {
    const current = await repo.getDistribution(d.id);
    if (current?.status === "paid") return current;
    throw new ServiceError(409, "Estado de distribución inesperado");
  }
  const sub = await repo.getSubmission(d.submission_id);
  if (sub && sub.status === "approved" && sub.rewarded_views === d.views_to) {
    await repo.updateSubmission(sub.id, { status: "paid" });
  }
  return paid;
}

async function markFailed(d: RewardDistribution, error: string) {
  return getRepo().transitionDistribution(d.id, ["submitted"], { status: "failed", error });
}

export type PayoutResult =
  | { state: "paid"; distribution: RewardDistribution; message: string }
  | { state: "pending"; distribution: RewardDistribution; message: string };

const SUBMITTED_EXPIRY_MS = 3 * 60 * 1000;

/**
 * Pago on-chain idempotente:
 * 1. Si ya hay tx registrada, consulta su resultado final antes de reintentar.
 * 2. Bloquea la distribución (compare-and-set reserved/failed -> submitted).
 * 3. Simula, firma y registra el hash ANTES de enviar.
 * 4. Solo marca `paid` cuando getTransaction devuelve SUCCESS.
 * El contrato rechaza reward_id repetidos, así que un reintento nunca paga dos veces.
 */
export async function payoutDistribution(distributionId: string): Promise<PayoutResult> {
  const repo = getRepo();
  let d = await repo.getDistribution(distributionId);
  if (!d) throw new ServiceError(404, "Distribución no encontrada");
  if (d.status === "paid") return { state: "paid", distribution: d, message: "Ya estaba pagada" };
  if (d.status === "cancelled") throw new ServiceError(409, "La reserva fue liberada");
  if (!isStellarReady()) {
    throw new ServiceError(
      422,
      "Stellar no está configurado (WAVO_CONTRACT_ID / STELLAR_ADMIN_SECRET). No se puede pagar on-chain.",
    );
  }
  const campaign = await repo.getCampaign(d.campaign_id);
  if (!campaign?.contract_campaign_id) {
    throw new ServiceError(422, "La campaña no está vinculada a un ID on-chain");
  }
  const participant = await repo.getParticipant(d.participant_id);
  if (!participant) throw new ServiceError(404, "Creador no encontrado");

  if (d.status === "submitted" && d.tx_hash) {
    const out = await getTxOutcome(d.tx_hash);
    if (out.status === "SUCCESS") {
      return { state: "paid", distribution: await markPaid(d), message: "Transacción confirmada" };
    }
    if (out.status === "FAILED") {
      d = (await markFailed(d, "La transacción falló en la red")) ?? d;
    } else if (Date.now() - new Date(d.updated_at).getTime() < SUBMITTED_EXPIRY_MS) {
      return { state: "pending", distribution: d, message: "Transacción enviada, esperando confirmación" };
    } else {
      d = (await markFailed(d, "Transacción expirada sin confirmación")) ?? d;
    }
  } else if (d.status === "submitted") {
    if (Date.now() - new Date(d.updated_at).getTime() < SUBMITTED_EXPIRY_MS) {
      throw new ServiceError(409, "Hay un pago en curso para esta recompensa");
    }
    d = (await markFailed(d, "Envío interrumpido antes de transmitir")) ?? d;
  }

  const onchainStatus = await getOnchainRewardStatus(d.reward_id);
  if (onchainStatus === "Paid") {
    if (d.tx_hash && (await getTxOutcome(d.tx_hash)).status === "SUCCESS") {
      return { state: "paid", distribution: await markPaid(d), message: "Transacción confirmada" };
    }
    throw new ServiceError(
      409,
      "Este reward_id ya figura pagado on-chain (p. ej. el modo demo se reinició y perdió el registro). No se paga dos veces. Para repetir la demo usa una campaña on-chain nueva (scripts/04 + DEMO_ONCHAIN_CAMPAIGN_ID).",
    );
  }

  if (!(await accountExists(participant.stellar_address))) {
    throw new ServiceError(
      422,
      "La cuenta del creador no existe en Testnet. Debe fondearla con Friendbot antes de recibir pagos.",
    );
  }

  const locked = await repo.transitionDistribution(d.id, ["reserved", "failed"], {
    status: "submitted",
    tx_hash: null,
    error: null,
  });
  if (!locked) throw new ServiceError(409, "Otro proceso está pagando esta recompensa");

  let prepared;
  try {
    prepared = await prepareDistribute({
      campaignId: campaign.contract_campaign_id,
      rewardId: d.reward_id,
      recipient: participant.stellar_address,
      amount: d.amount,
    });
  } catch (e) {
    const msg = describeContractError(e);
    await markFailed(locked, msg);
    throw new ServiceError(422, `Simulación rechazada: ${msg}`);
  }

  const withHash = await repo.transitionDistribution(d.id, ["submitted"], { tx_hash: prepared.hash });
  if (!withHash) throw new ServiceError(409, "Estado cambió durante el pago");

  const sent = await prepared.send();
  if (sent.status === "ERROR" || sent.status === "TRY_AGAIN_LATER") {
    await markFailed(withHash, sent.status === "ERROR" ? "La red rechazó la transacción" : "Red ocupada, reintenta");
    throw new ServiceError(502, `sendTransaction devolvió ${sent.status}`);
  }

  const out = await waitForTx(prepared.hash);
  if (out.status === "SUCCESS") {
    return { state: "paid", distribution: await markPaid(withHash), message: "Pago confirmado on-chain" };
  }
  if (out.status === "FAILED") {
    await markFailed(withHash, "La transacción falló en la red");
    throw new ServiceError(502, "La transacción falló en la red");
  }
  return {
    state: "pending",
    distribution: withHash,
    message: "Transacción enviada; aún sin confirmación final. Vuelve a consultar en unos segundos.",
  };
}

export async function linkOnchainCampaign(campaignId: string, contractCampaignId: string) {
  const repo = getRepo();
  const campaign = await repo.getCampaign(campaignId);
  if (!campaign) throw new ServiceError(404, "Campaña no encontrada");
  if (!isStellarReady()) throw new ServiceError(422, "Stellar no está configurado");
  const onchain = await getOnchainCampaign(contractCampaignId).catch((e) => {
    throw new ServiceError(422, describeContractError(e));
  });
  if (onchain.cpm !== campaign.cpm) {
    throw new ServiceError(
      422,
      `El CPM on-chain (${formatUnits(onchain.cpm)}) no coincide con la campaña (${formatUnits(campaign.cpm)})`,
    );
  }
  return repo.updateCampaign(campaignId, {
    contract_campaign_id: contractCampaignId,
    token_address: getServerConfig().stellar.tokenContractId,
  });
}

export async function setCampaignStatus(campaignId: string, status: CampaignStatus) {
  return getRepo().updateCampaign(campaignId, { status });
}
