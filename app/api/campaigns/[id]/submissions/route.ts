import { readJson, route } from "@/lib/http";
import { submitContent } from "@/lib/services";
import { submissionSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req, { params }: Ctx) => {
  const { id } = await params;
  const input = submissionSchema.parse(await readJson(req));
  return { submission: await submitContent(id, input.stellar_address, input.content_url) };
});
