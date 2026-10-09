import { adminRoute } from "@/lib/http";
import { approveSubmission } from "@/lib/services";

type Ctx = { params: Promise<{ id: string }> };

export const POST = adminRoute(async (_req, { params }: Ctx) => {
  const { id } = await params;
  return approveSubmission(id);
});
