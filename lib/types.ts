export type Platform = "tiktok" | "instagram" | "youtube";
export type CampaignPlatform = Platform | "any";
export type CampaignStatus = "active" | "paused" | "closed";
export type SubmissionStatus = "pending" | "verified" | "approved" | "paid" | "rejected";
/**
 * reserved  -> aprobada off-chain, fondos comprometidos en la base de datos
 * submitted -> transacción enviada a Stellar, esperando confirmación final
 * paid      -> transacción confirmada (SUCCESS) en Testnet
 * failed    -> la transacción falló o expiró; sigue reservada y se puede reintentar
 * cancelled -> reserva liberada por el admin
 */
export type DistributionStatus = "reserved" | "submitted" | "paid" | "failed" | "cancelled";

/** Montos en unidades mínimas del token (stroops para XLM, 7 decimales). */
export interface Campaign {
  id: string;
  title: string;
  description: string;
  brand_name: string;
  platform: CampaignPlatform;
  rules: string;
  budget: bigint;
  cpm: bigint;
  max_reward: bigint;
  status: CampaignStatus;
  contract_campaign_id: string | null;
  token_address: string | null;
  created_at: string;
}

export interface Participant {
  id: string;
  campaign_id: string;
  display_name: string;
  stellar_address: string;
  joined_at: string;
}

export interface Submission {
  id: string;
  campaign_id: string;
  participant_id: string;
  content_url: string;
  platform: Platform;
  status: SubmissionStatus;
  verified_views: number;
  rewarded_views: number;
  pending_reward: bigint;
  created_at: string;
}

export interface RewardDistribution {
  id: string;
  campaign_id: string;
  submission_id: string;
  participant_id: string;
  reward_id: string;
  amount: bigint;
  views_from: number;
  views_to: number;
  tx_hash: string | null;
  status: DistributionStatus;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewCampaign {
  title: string;
  description: string;
  brand_name: string;
  platform: CampaignPlatform;
  rules: string;
  budget: bigint;
  cpm: bigint;
  max_reward: bigint;
  contract_campaign_id?: string | null;
  token_address?: string | null;
}

export const COMMITTED_STATUSES: DistributionStatus[] = ["reserved", "submitted", "failed", "paid"];
export const RESERVED_STATUSES: DistributionStatus[] = ["reserved", "submitted", "failed"];
