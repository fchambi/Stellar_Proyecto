import { randomUUID } from "node:crypto";
import { seedData } from "../seed-data";
import { COMMITTED_STATUSES, type Campaign, type Participant, type RewardDistribution, type Submission } from "../types";
import { RepoError, type Repo } from "./types";

interface MemoryState {
  campaigns: Campaign[];
  participants: Participant[];
  submissions: Submission[];
  distributions: RewardDistribution[];
}

const globalForState = globalThis as unknown as { __wavoMemory?: MemoryState };

/**
 * Demo local SIN persistencia: los datos viven en memoria del proceso y se pierden al
 * reiniciar (y no se comparten entre instancias serverless en Vercel).
 */
function state(): MemoryState {
  if (!globalForState.__wavoMemory) {
    globalForState.__wavoMemory = { ...seedData(), distributions: [] };
  }
  return globalForState.__wavoMemory;
}

const clone = <T>(v: T): T => structuredClone(v);
const now = () => new Date().toISOString();

export function createMemoryRepo(): Repo {
  return {
    mode: "memory",

    async listCampaigns() {
      return clone([...state().campaigns].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    },
    async getCampaign(id) {
      return clone(state().campaigns.find((c) => c.id === id) ?? null);
    },
    async createCampaign(input) {
      const c: Campaign = {
        id: randomUUID(),
        status: "active",
        contract_campaign_id: input.contract_campaign_id ?? null,
        token_address: input.token_address ?? null,
        created_at: now(),
        title: input.title,
        description: input.description,
        brand_name: input.brand_name,
        platform: input.platform,
        rules: input.rules,
        budget: input.budget,
        cpm: input.cpm,
        max_reward: input.max_reward,
      };
      state().campaigns.push(c);
      return clone(c);
    },
    async updateCampaign(id, patch) {
      const c = state().campaigns.find((x) => x.id === id);
      if (!c) throw new RepoError("not_found", "Campaña no encontrada");
      if (
        patch.contract_campaign_id &&
        state().campaigns.some((x) => x.id !== id && x.contract_campaign_id === patch.contract_campaign_id)
      ) {
        throw new RepoError("conflict", "Ese ID on-chain ya está vinculado a otra campaña");
      }
      Object.assign(c, patch);
      return clone(c);
    },

    async listParticipants(campaignId) {
      return clone(state().participants.filter((p) => !campaignId || p.campaign_id === campaignId));
    },
    async getParticipant(id) {
      return clone(state().participants.find((p) => p.id === id) ?? null);
    },
    async findParticipant(campaignId, address) {
      return clone(
        state().participants.find((p) => p.campaign_id === campaignId && p.stellar_address === address) ?? null,
      );
    },
    async createParticipant(input) {
      if (state().participants.some((p) => p.campaign_id === input.campaign_id && p.stellar_address === input.stellar_address)) {
        throw new RepoError("conflict", "Esta dirección ya participa en la campaña");
      }
      const p: Participant = { id: randomUUID(), joined_at: now(), ...input };
      state().participants.push(p);
      return clone(p);
    },

    async listSubmissions(campaignId) {
      return clone(
        state()
          .submissions.filter((s) => !campaignId || s.campaign_id === campaignId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      );
    },
    async getSubmission(id) {
      return clone(state().submissions.find((s) => s.id === id) ?? null);
    },
    async createSubmission(input) {
      if (state().submissions.some((s) => s.campaign_id === input.campaign_id && s.content_url === input.content_url)) {
        throw new RepoError("conflict", "Este contenido ya fue enviado a la campaña");
      }
      const s: Submission = {
        id: randomUUID(),
        status: "pending",
        verified_views: 0,
        rewarded_views: 0,
        pending_reward: 0n,
        created_at: now(),
        ...input,
      };
      state().submissions.push(s);
      return clone(s);
    },
    async updateSubmission(id, patch) {
      const s = state().submissions.find((x) => x.id === id);
      if (!s) throw new RepoError("not_found", "Envío no encontrado");
      Object.assign(s, patch);
      return clone(s);
    },

    async listDistributions(campaignId) {
      return clone(
        state()
          .distributions.filter((d) => !campaignId || d.campaign_id === campaignId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      );
    },
    async getDistribution(id) {
      return clone(state().distributions.find((d) => d.id === id) ?? null);
    },
    async reserveReward(args) {
      const st = state();
      const existing = st.distributions.find((d) => d.reward_id === args.reward_id);
      if (existing) return clone(existing);

      const sub = st.submissions.find((s) => s.id === args.submission_id);
      if (!sub) throw new RepoError("not_found", "Envío no encontrado");
      const campaign = st.campaigns.find((c) => c.id === sub.campaign_id)!;
      if (campaign.status !== "active") throw new RepoError("campaign_not_active", "La campaña no está activa");
      if (sub.rewarded_views !== args.views_from || sub.verified_views !== args.views_to) {
        throw new RepoError("stale_snapshot", "Las vistas cambiaron; recalcula la recompensa");
      }
      const committed = st.distributions
        .filter((d) => d.campaign_id === campaign.id && COMMITTED_STATUSES.includes(d.status))
        .reduce((a, d) => a + d.amount, 0n);
      if (campaign.budget - committed < args.amount) {
        throw new RepoError("insufficient_budget", "Presupuesto insuficiente");
      }
      if (campaign.max_reward > 0n) {
        const creator = st.distributions
          .filter(
            (d) =>
              d.campaign_id === campaign.id &&
              d.participant_id === sub.participant_id &&
              COMMITTED_STATUSES.includes(d.status),
          )
          .reduce((a, d) => a + d.amount, 0n);
        if (creator + args.amount > campaign.max_reward) {
          throw new RepoError("max_reward_exceeded", "Supera el máximo por creador");
        }
      }
      const d: RewardDistribution = {
        id: randomUUID(),
        campaign_id: campaign.id,
        submission_id: sub.id,
        participant_id: sub.participant_id,
        reward_id: args.reward_id,
        amount: args.amount,
        views_from: args.views_from,
        views_to: args.views_to,
        tx_hash: null,
        status: "reserved",
        error: null,
        created_at: now(),
        updated_at: now(),
      };
      st.distributions.push(d);
      Object.assign(sub, { rewarded_views: args.views_to, pending_reward: 0n, status: "approved" });
      return clone(d);
    },
    async cancelReward(distributionId) {
      const st = state();
      const d = st.distributions.find((x) => x.id === distributionId);
      if (!d) throw new RepoError("not_found", "Distribución no encontrada");
      if (d.status !== "reserved" && d.status !== "failed") {
        throw new RepoError("not_cancellable", "Solo se pueden liberar reservas no enviadas o fallidas");
      }
      Object.assign(d, { status: "cancelled", updated_at: now() });
      const sub = st.submissions.find((s) => s.id === d.submission_id);
      if (sub && sub.rewarded_views === d.views_to) {
        Object.assign(sub, { rewarded_views: d.views_from, status: "verified" });
      }
      return clone(d);
    },
    async transitionDistribution(id, from, patch) {
      const d = state().distributions.find((x) => x.id === id);
      if (!d || !from.includes(d.status)) return null;
      Object.assign(d, patch, { updated_at: now() });
      return clone(d);
    },
  };
}
