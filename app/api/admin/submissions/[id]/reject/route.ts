import { adminRoute } from "@/lib/http";
import { rejectSubmission } from "@/lib/services";

type Ctx = { params: Promise<{ id: string }> };

export const POST = adminRoute(async (_req, { params }: Ctx) => {
  const { id } = await params;
  return { submission: await rejectSubmission(id) };
});
