import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";
import { toBigInt } from "../money";
import type { Campaign, Participant, RewardDistribution, Submission } from "../types";
import { RepoError, type Repo } from "./types";

type Row = Record<string, unknown>;

const mapCampaign = (r: Row): Campaign => ({
  ...(r as unknown as Campaign),
  budget: toBigInt(r.budget),
  cpm: toBigInt(r.cpm),
  max_reward: toBigInt(r.max_reward),
});

const mapSubmission = (r: Row): Submission => ({
  ...(r as unknown as Submission),
  verified_views: Number(r.verified_views),
  rewarded_views: Number(r.rewarded_views),
  pending_reward: toBigInt(r.pending_reward),
});

const mapDistribution = (r: Row): RewardDistribution => ({
  ...(r as unknown as RewardDistribution),
  amount: toBigInt(r.amount),
  views_from: Number(r.views_from),
  views_to: Number(r.views_to),
});

const RPC_ERRORS: Record<string, RepoError["code"]> = {
  stale_snapshot: "stale_snapshot",
  insufficient_budget: "insufficient_budget",
  max_reward_exceeded: "max_reward_exceeded",
  campaign_not_active: "campaign_not_active",
  submission_not_found: "not_found",
  distribution_not_found: "not_found",
  distribution_not_cancellable: "not_cancellable",
};

function fail(error: PostgrestError): never {
  if (error.code === "23505") throw new RepoError("conflict", "Registro duplicado");
  const code = Object.keys(RPC_ERRORS).find((k) => error.message?.includes(k));
  if (code) throw new RepoError(RPC_ERRORS[code], code);
  throw new RepoError("unknown", error.message);
}

/** Envía bigint como string: PostgREST lo castea a bigint sin pasar por float. */
const big = (v: bigint) => v.toString();

export function createSupabaseRepo(url: string, serviceRoleKey: string): Repo {
  const db: SupabaseClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    mode: "supabase",

    async listCampaigns() {
      const { data, error } = await db.from("campaigns").select("*").order("created_at", { ascending: false });
      if (error) fail(error);
      return (data ?? []).map(mapCampaign);
    },
    async getCampaign(id) {
      const { data, error } = await db.from("campaigns").select("*").eq("id", id).maybeSingle();
      if (error) fail(error);
      return data ? mapCampaign(data) : null;
    },
    async createCampaign(input) {
      const { data, error } = await db
        .from("campaigns")
        .insert({
          ...input,
          budget: big(input.budget),
          cpm: big(input.cpm),
          max_reward: big(input.max_reward),
        })
        .select("*")
        .single();
      if (error) fail(error);
      return mapCampaign(data);
    },
    async updateCampaign(id, patch) {
      const { data, error } = await db.from("campaigns").update(patch).eq("id", id).select("*").single();
      if (error) fail(error);
      return mapCampaign(data);
    },

    async listParticipants(campaignId) {
      let q = db.from("participants").select("*").order("joined_at", { ascending: true });
      if (campaignId) q = q.eq("campaign_id", campaignId);
      const { data, error } = await q;
      if (error) fail(error);
      return (data ?? []) as Participant[];
    },
    async getParticipant(id) {
      const { data, error } = await db.from("participants").select("*").eq("id", id).maybeSingle();
      if (error) fail(error);
      return (data as Participant) ?? null;
    },
    async findParticipant(campaignId, address) {
      const { data, error } = await db
        .from("participants")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("stellar_address", address)
        .maybeSingle();
      if (error) fail(error);
      return (data as Participant) ?? null;
    },
    async createParticipant(input) {
      const { data, error } = await db.from("participants").insert(input).select("*").single();
      if (error) fail(error);
      return data as Participant;
    },

    async listSubmissions(campaignId) {
      let q = db.from("submissions").select("*").order("created_at", { ascending: false });
      if (campaignId) q = q.eq("campaign_id", campaignId);
      const { data, error } = await q;
      if (error) fail(error);
      return (data ?? []).map(mapSubmission);
    },
    async getSubmission(id) {
      const { data, error } = await db.from("submissions").select("*").eq("id", id).maybeSingle();
      if (error) fail(error);
      return data ? mapSubmission(data) : null;
    },
    async createSubmission(input) {
      const { data, error } = await db.from("submissions").insert(input).select("*").single();
      if (error) fail(error);
      return mapSubmission(data);
    },
    async updateSubmission(id, patch) {
      const row: Row = { ...patch };
      if (patch.pending_reward !== undefined) row.pending_reward = big(patch.pending_reward);
      const { data, error } = await db.from("submissions").update(row).eq("id", id).select("*").single();
      if (error) fail(error);
      return mapSubmission(data);
    },

    async listDistributions(campaignId) {
      let q = db.from("reward_distributions").select("*").order("created_at", { ascending: false });
      if (campaignId) q = q.eq("campaign_id", campaignId);
      const { data, error } = await q;
      if (error) fail(error);
      return (data ?? []).map(mapDistribution);
    },
    async getDistribution(id) {
      const { data, error } = await db.from("reward_distributions").select("*").eq("id", id).maybeSingle();
      if (error) fail(error);
      return data ? mapDistribution(data) : null;
    },
    async reserveReward(args) {
      const { data, error } = await db.rpc("wavo_reserve_reward", {
        p_submission_id: args.submission_id,
        p_reward_id: args.reward_id,
        p_amount: big(args.amount),
        p_views_from: args.views_from,
        p_views_to: args.views_to,
      });
      if (error) fail(error);
      return mapDistribution(data as Row);
    },
    async cancelReward(distributionId) {
      const { data, error } = await db.rpc("wavo_cancel_reward", { p_distribution_id: distributionId });
      if (error) fail(error);
      return mapDistribution(data as Row);
    },
    async transitionDistribution(id, from, patch) {
      const { data, error } = await db
        .from("reward_distributions")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .in("status", from)
        .select("*");
      if (error) fail(error);
      return data && data.length > 0 ? mapDistribution(data[0]) : null;
    },
  };
}
