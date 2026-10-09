import { adminRoute } from "@/lib/http";
import { payoutDistribution } from "@/lib/services";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export const POST = adminRoute(async (_req, { params }: Ctx) => {
  const { id } = await params;
  return payoutDistribution(id);
});
