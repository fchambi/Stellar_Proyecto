import { adminRoute, readJson } from "@/lib/http";
import { setCampaignStatus } from "@/lib/services";
import { statusSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const POST = adminRoute(async (req, { params }: Ctx) => {
  const { id } = await params;
  const { status } = statusSchema.parse(await readJson(req));
  return { campaign: await setCampaignStatus(id, status) };
});
