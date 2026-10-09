import { adminRoute, readJson } from "@/lib/http";
import { linkOnchainCampaign } from "@/lib/services";
import { linkSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const POST = adminRoute(async (req, { params }: Ctx) => {
  const { id } = await params;
  const { contract_campaign_id } = linkSchema.parse(await readJson(req));
  return { campaign: await linkOnchainCampaign(id, contract_campaign_id) };
});
