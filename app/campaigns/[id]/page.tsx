import { notFound } from "next/navigation";
import { ExternalLink, Link2, ShieldCheck } from "lucide-react";
import { BudgetBar } from "@/components/budget-bar";
import { CreatorForms } from "@/components/forms/creator-forms";
import { DistributionsTable } from "@/components/distributions-table";
import { PlatformBadge, StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicStatus } from "@/lib/config";
import { formatUnits, formatViews } from "@/lib/money";
import { getCampaignView, getOnchainSafe } from "@/lib/services";
import { explorerContract, shortAddress } from "@/lib/stellar/explorer";

export const dynamic = "force-dynamic";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = await getCampaignView(id);
  if (!view) notFound();
  const { campaign, totals, participants, submissions, distributions } = view;
  const status = getPublicStatus();
  const sym = status.tokenSymbol;
  const onchain = await getOnchainSafe(campaign);
  const byId = new Map(participants.map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="wavo-gradient grid size-14 place-items-center rounded-xl text-lg font-semibold text-white">
            {campaign.brand_name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <p className="text-sm text-muted-foreground">{campaign.brand_name}</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{campaign.title}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge status={campaign.status} />
              <PlatformBadge platform={campaign.platform} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Mini label="CPM" value={`${formatUnits(campaign.cpm)} ${sym}`} hint="por 1.000 vistas" />
            <Mini label="Presupuesto" value={`${formatUnits(campaign.budget)} ${sym}`} />
            <Mini label="Máx. por creador" value={campaign.max_reward > 0n ? `${formatUnits(campaign.max_reward)} ${sym}` : "Sin tope"} />
            <Mini label="Disponible" value={`${formatUnits(totals.available)} ${sym}`} />
          </div>
          <Card>
            <CardContent>
              <BudgetBar totals={totals} symbol={sym} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Descripción</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p className="whitespace-pre-line">{campaign.description}</p>
              {campaign.rules && (
                <div>
                  <h3 className="mb-1 font-medium text-foreground">Reglas</h3>
                  <p className="whitespace-pre-line">{campaign.rules}</p>
                </div>
              )}
              <p className="rounded-lg bg-muted/40 p-3 text-xs">
                Recompensa = floor(vistas nuevas verificadas × CPM / 1000), con tope por creador. Las vistas se verifican
                manualmente; solo se pagan vistas nuevas desde el último pago.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Envíos ({submissions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay envíos.</p>
              ) : (
                <div className="divide-y divide-border/60">
                  {submissions.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium">{byId.get(s.participant_id)?.display_name ?? "Creador"}</p>
                        <a href={s.content_url} target="_blank" rel="noreferrer" className="block max-w-xs truncate text-xs text-muted-foreground hover:text-primary sm:max-w-md">
                          {s.content_url}
                        </a>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground tabular-nums">{formatViews(s.verified_views)}</span> vistas
                        </span>
                        {s.pending_reward > 0n && (
                          <span className="text-muted-foreground">
                            Estimado: <span className="text-foreground">{formatUnits(s.pending_reward)} {sym}</span>
                          </span>
                        )}
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial de pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <DistributionsTable distributions={distributions} participants={participants} symbol={sym} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Participa</CardTitle>
            </CardHeader>
            <CardContent>
              <CreatorForms campaignId={campaign.id} active={campaign.status === "active"} />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> Custodia on-chain
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              {campaign.contract_campaign_id ? (
                <>
                  <Row label="ID on-chain" value={`#${campaign.contract_campaign_id}`} />
                  {status.contractId && (
                    <Row
                      label="Contrato"
                      value={
                        <a href={explorerContract(status.contractId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          {shortAddress(status.contractId, 6)} <ExternalLink className="size-3" />
                        </a>
                      }
                    />
                  )}
                  {onchain.data && (
                    <>
                      <Row label="Financiado" value={`${formatUnits(onchain.data.funded)} ${sym}`} />
                      <Row label="Pagado on-chain" value={`${formatUnits(onchain.data.paid)} ${sym}`} />
                      <Row label="Disponible on-chain" value={`${formatUnits(onchain.data.available)} ${sym}`} />
                      {onchain.data.closed && <Row label="Estado" value="Cerrada" />}
                    </>
                  )}
                  {onchain.error && <p className="text-red-300">No se pudo leer el contrato: {onchain.error}</p>}
                  {!status.stellarReady && <p>Stellar no configurado en este entorno: no se puede leer el estado on-chain.</p>}
                </>
              ) : (
                <p className="flex items-start gap-2">
                  <Link2 className="mt-0.5 size-3.5 shrink-0" />
                  Esta campaña aún no está vinculada a fondos en el contrato. Los pagos on-chain se habilitan cuando el admin la vincula.
                </p>
              )}
              <p className="pt-1">{participants.length} creadores registrados</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
