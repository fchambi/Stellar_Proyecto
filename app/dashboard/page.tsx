import Link from "next/link";
import { CheckCircle2, CircleDollarSign, ExternalLink, Lock, Wallet } from "lucide-react";
import { BudgetBar } from "@/components/budget-bar";
import { DistributionsTable } from "@/components/distributions-table";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicStatus } from "@/lib/config";
import { formatUnits, sumBigInt } from "@/lib/money";
import { listCampaignViews } from "@/lib/services";
import { explorerContract, shortAddress } from "@/lib/stellar/explorer";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const views = await listCampaignViews();
  const status = getPublicStatus();
  const sym = status.tokenSymbol;
  const total = (k: "budget" | "reserved" | "paid" | "available") => sumBigInt(views.map((v) => v.totals[k]));
  const distributions = views.flatMap((v) => v.distributions).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const participants = views.flatMap((v) => v.participants);
  const titles = new Map(views.map((v) => [v.campaign.id, v.campaign.title]));
  const paidCount = distributions.filter((d) => d.status === "paid").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Presupuesto, compromisos y pagos confirmados en Stellar Testnet.</p>
        </div>
        {status.contractId && (
          <a href={explorerContract(status.contractId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
            Contrato WavoRewards {shortAddress(status.contractId, 6)} <ExternalLink className="size-3" />
          </a>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Presupuesto total" value={`${formatUnits(total("budget"))} ${sym}`} hint={views.length === 1 ? "1 campaña" : `${views.length} campañas`} icon={Wallet} accent="text-primary" />
        <StatCard label="Reservado" value={`${formatUnits(total("reserved"))} ${sym}`} hint="Aprobado, pendiente de pago" icon={Lock} accent="text-violet-300" />
        <StatCard label="Pagado" value={`${formatUnits(total("paid"))} ${sym}`} hint={paidCount === 1 ? "1 pago confirmado" : `${paidCount} pagos confirmados`} icon={CheckCircle2} accent="text-emerald-300" />
        <StatCard label="Disponible" value={`${formatUnits(total("available"))} ${sym}`} hint="Presupuesto − reservado − pagado" icon={CircleDollarSign} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Campañas</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border/60">
          {views.length === 0 && <p className="text-sm text-muted-foreground">Sin campañas.</p>}
          {views.map((v) => {
            const estimated = sumBigInt(v.submissions.filter((s) => s.status === "verified").map((s) => s.pending_reward));
            return (
              <div key={v.campaign.id} className="grid gap-3 py-4 md:grid-cols-[1.2fr_1fr] md:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/campaigns/${v.campaign.id}`} className="truncate font-medium hover:text-primary">
                      {v.campaign.title}
                    </Link>
                    <StatusBadge status={v.campaign.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {v.campaign.brand_name} · CPM {formatUnits(v.campaign.cpm)} {sym} · {v.participants.length} creadores ·{" "}
                    {v.submissions.length} envíos
                    {v.campaign.contract_campaign_id ? ` · on-chain #${v.campaign.contract_campaign_id}` : " · sin vincular on-chain"}
                  </p>
                  {estimated > 0n && (
                    <p className="mt-1 text-xs text-sky-300">Estimación por aprobar: {formatUnits(estimated)} {sym} (no comprometido)</p>
                  )}
                </div>
                <BudgetBar totals={v.totals} symbol={sym} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Historial de recompensas</CardTitle>
        </CardHeader>
        <CardContent>
          <DistributionsTable distributions={distributions} participants={participants} symbol={sym} campaignTitles={titles} />
          <p className="mt-4 text-[11px] text-muted-foreground">
            Solo se muestra el enlace al explorer cuando la transacción fue confirmada (SUCCESS) por la red. Estados: Reservado → Enviado a Stellar → Pagado.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
