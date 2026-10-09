import { AdminCampaignPanel } from "@/components/admin/admin-campaign-panel";
import { AdminLogin, LogoutButton } from "@/components/admin/admin-login";
import { isAdminConfigured, isAdminSession } from "@/lib/auth";
import { getPublicStatus } from "@/lib/config";
import { toJSONSafe } from "@/lib/http";
import { listCampaignViews } from "@/lib/services";
import type { AdminCampaignData } from "@/components/admin/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const status = getPublicStatus();
  if (!(await isAdminSession())) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <AdminLogin configured={isAdminConfigured()} />
      </div>
    );
  }
  const views = await listCampaignViews();
  const data = toJSONSafe(views) as AdminCampaignData[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Panel de revisión</h1>
          <p className="mt-1 text-muted-foreground">
            Verifica vistas manualmente, aprueba recompensas (reserva off-chain) y ejecuta pagos on-chain.
          </p>
        </div>
        <LogoutButton />
      </div>
      <div className="mt-8 space-y-8">
        {data.map((v) => (
          <AdminCampaignPanel key={v.campaign.id} data={v} symbol={status.tokenSymbol} stellarReady={status.stellarReady} />
        ))}
      </div>
    </div>
  );
}
