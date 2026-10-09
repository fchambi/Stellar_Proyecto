import { readJson, route } from "@/lib/http";
import { joinCampaign } from "@/lib/services";
import { joinSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req, { params }: Ctx) => {
  const { id } = await params;
  const input = joinSchema.parse(await readJson(req));
  return joinCampaign(id, input.display_name, input.stellar_address);
});
