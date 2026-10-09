import { readJson, route } from "@/lib/http";
import { createCampaign, listCampaignViews } from "@/lib/services";
import { campaignSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const views = await listCampaignViews();
  return views.map((v) => ({ ...v.campaign, totals: v.totals }));
});

export const POST = route(async (req) => {
  const input = campaignSchema.parse(await readJson(req));
  return { campaign: await createCampaign(input) };
});
