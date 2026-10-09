import { getPublicStatus } from "@/lib/config";
import { route } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async () => getPublicStatus());
