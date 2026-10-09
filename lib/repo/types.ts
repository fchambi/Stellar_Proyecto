import type {
  Campaign,
  CampaignStatus,
  DistributionStatus,
  NewCampaign,
  Participant,
  Platform,
  RewardDistribution,
  Submission,
  SubmissionStatus,
} from "../types";

export class RepoError extends Error {
  constructor(
    public code:
      | "not_found"
      | "conflict"
      | "stale_snapshot"
      | "insufficient_budget"
      | "max_reward_exceeded"
      | "campaign_not_active"
      | "not_cancellable"
      | "unknown",
    message: string,
  ) {
    super(message);
  }
}

export interface ReserveRewardArgs {
  submission_id: string;
  reward_id: string;
  amount: bigint;
  views_from: number;
  views_to: number;
}

export interface DistributionPatch {
  status?: DistributionStatus;
  tx_hash?: string | null;
  error?: string | null;
}

export interface Repo {
  mode: "supabase" | "memory";
  listCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | null>;
  createCampaign(input: NewCampaign): Promise<Campaign>;
  updateCampaign(
    id: string,
    patch: Partial<Pick<Campaign, "status" | "contract_campaign_id" | "token_address">> & {
      status?: CampaignStatus;
    },
  ): Promise<Campaign>;

  listParticipants(campaignId?: string): Promise<Participant[]>;
  getParticipant(id: string): Promise<Participant | null>;
  findParticipant(campaignId: string, stellarAddress: string): Promise<Participant | null>;
  createParticipant(input: {
    campaign_id: string;
    display_name: string;
    stellar_address: string;
  }): Promise<Participant>;

  listSubmissions(campaignId?: string): Promise<Submission[]>;
  getSubmission(id: string): Promise<Submission | null>;
  createSubmission(input: {
    campaign_id: string;
    participant_id: string;
    content_url: string;
    platform: Platform;
  }): Promise<Submission>;
  updateSubmission(
    id: string,
    patch: Partial<{ status: SubmissionStatus; verified_views: number; pending_reward: bigint }>,
  ): Promise<Submission>;

  listDistributions(campaignId?: string): Promise<RewardDistribution[]>;
  getDistribution(id: string): Promise<RewardDistribution | null>;
  /** Atómico: valida snapshot, presupuesto y tope por creador; reserva y avanza rewarded_views. */
  reserveReward(args: ReserveRewardArgs): Promise<RewardDistribution>;
  /** Atómico: libera una reserva no pagada y restaura el snapshot del envío. */
  cancelReward(distributionId: string): Promise<RewardDistribution>;
  /** Compare-and-set de estado. Devuelve null si el estado actual no está en `from`. */
  transitionDistribution(
    id: string,
    from: DistributionStatus[],
    patch: DistributionPatch,
  ): Promise<RewardDistribution | null>;
}
