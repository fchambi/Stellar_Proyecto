import type { Campaign, Participant, RewardDistribution, Submission } from "@/lib/types";

/** Versión serializada (bigint -> string) para componentes cliente. */
type Ser<T> = { [K in keyof T]: T[K] extends bigint ? string : T[K] };

export interface AdminCampaignData {
  campaign: Ser<Campaign>;
  totals: { budget: string; reserved: string; paid: string; available: string };
  participants: Participant[];
  submissions: Ser<Submission>[];
  distributions: Ser<RewardDistribution>[];
}
