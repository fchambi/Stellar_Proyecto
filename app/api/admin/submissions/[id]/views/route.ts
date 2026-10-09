import { adminRoute, readJson } from "@/lib/http";
import { setVerifiedViews } from "@/lib/services";
import { viewsSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const POST = adminRoute(async (req, { params }: Ctx) => {
  const { id } = await params;
  const { verified_views } = viewsSchema.parse(await readJson(req));
  return { submission: await setVerifiedViews(id, verified_views) };
});
