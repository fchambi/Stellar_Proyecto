"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Check, ExternalLink, Link2, Loader2, RefreshCw, Save, Send, Undo2, X } from "lucide-react";
import { PlatformBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { postJSON } from "@/lib/client-api";
import { formatUnits, formatViews } from "@/lib/money";
import { explorerTx, shortAddress } from "@/lib/stellar/explorer";
import type { AdminCampaignData } from "./types";

export function AdminCampaignPanel({
  data,
  symbol,
  stellarReady,
}: {
  data: AdminCampaignData;
  symbol: string;
  stellarReady: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [views, setViews] = useState<Record<string, string>>({});
  const [onchainId, setOnchainId] = useState("");
  const { campaign, totals, participants, submissions, distributions } = data;
  const byId = new Map(participants.map((p) => [p.id, p]));
  const fmt = (v: string) => `${formatUnits(BigInt(v))} ${symbol}`;

  async function run(key: string, fn: () => Promise<{ message?: string } | unknown>, success: string) {
    setBusy(key);
    try {
      const res = (await fn()) as { message?: string; state?: string };
      if (res?.state === "pending") toast.warning(res.message ?? "Pendiente de confirmación");
      else toast.success(res?.message ?? success);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message, { duration: 8000 });
    } finally {
      setBusy(null);
    }
  }

  const spin = (key: string, Icon: typeof Check) =>
    busy === key ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />;

  return (
    <Card>
      <CardHeader className="border-b border-border/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              {campaign.title} <StatusBadge status={campaign.status} />
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {campaign.brand_name} · CPM {fmt(campaign.cpm)} · Máx/creador{" "}
              {BigInt(campaign.max_reward) > 0n ? fmt(campaign.max_reward) : "sin tope"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["active", "paused", "closed"] as const)
              .filter((s) => s !== campaign.status)
              .map((s) => (
                <Button
                  key={s}
                  size="xs"
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() =>
                    run(`status-${s}`, () => postJSON(`/api/admin/campaigns/${campaign.id}/status`, { status: s }), "Estado actualizado")
                  }
                >
                  {s === "active" ? "Activar" : s === "paused" ? "Pausar" : "Cerrar"}
                </Button>
              ))}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <Pill label="Presupuesto" value={fmt(totals.budget)} />
          <Pill label="Reservado" value={fmt(totals.reserved)} />
          <Pill label="Pagado" value={fmt(totals.paid)} />
          <Pill label="Disponible" value={fmt(totals.available)} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {campaign.contract_campaign_id ? (
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <Link2 className="size-3.5" /> Vinculada a la campaña on-chain #{campaign.contract_campaign_id}
            </span>
          ) : (
            <>
              <span className="text-muted-foreground">Sin vincular on-chain.</span>
              <Input
                value={onchainId}
                onChange={(e) => setOnchainId(e.target.value)}
                placeholder="ID on-chain (u64)"
                className="h-7 w-36 text-xs"
              />
              <Button
                size="xs"
                disabled={!stellarReady || !onchainId || busy !== null}
                onClick={() =>
                  run("link", () => postJSON(`/api/admin/campaigns/${campaign.id}/link`, { contract_campaign_id: onchainId }), "Campaña vinculada")
                }
              >
                {spin("link", Link2)} Vincular
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <section>
          <h3 className="mb-2 text-sm font-medium">Envíos por revisar</h3>
          {submissions.length === 0 && <p className="text-sm text-muted-foreground">Sin envíos.</p>}
          <div className="divide-y divide-border/50">
            {submissions.map((s) => {
              const p = byId.get(s.participant_id);
              const draft = views[s.id] ?? String(s.verified_views);
              const canApprove = s.verified_views > s.rewarded_views && s.status !== "rejected";
              return (
                <div key={s.id} className="grid gap-3 py-3 lg:grid-cols-[1.3fr_1fr_auto] lg:items-center">
                  <div className="min-w-0 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p?.display_name}</span>
                      <PlatformBadge platform={s.platform} />
                      <StatusBadge status={s.status} />
                    </div>
                    <a href={s.content_url} target="_blank" rel="noreferrer" className="mt-0.5 block truncate text-xs text-muted-foreground hover:text-primary">
                      {s.content_url}
                    </a>
                    {p && <p className="font-mono text-[11px] text-muted-foreground">{shortAddress(p.stellar_address, 6)}</p>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Input
                        value={draft}
                        inputMode="numeric"
                        onChange={(e) => setViews((v) => ({ ...v, [s.id]: e.target.value.replace(/\D/g, "") }))}
                        className="h-7 w-28 text-xs tabular-nums"
                        aria-label="Vistas verificadas"
                      />
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={busy !== null || draft === String(s.verified_views) || s.status === "rejected"}
                        onClick={() =>
                          run(`views-${s.id}`, () => postJSON(`/api/admin/submissions/${s.id}/views`, { verified_views: Number(draft) }), "Vistas registradas")
                        }
                      >
                        {spin(`views-${s.id}`, Save)} Guardar vistas
                      </Button>
                    </div>
                    <p className="mt-1">
                      Recompensadas: {formatViews(s.rewarded_views)} · Nuevas: {formatViews(Math.max(s.verified_views - s.rewarded_views, 0))}
                      {BigInt(s.pending_reward) > 0n && <> · Estimado {fmt(s.pending_reward)}</>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!canApprove || busy !== null}
                      onClick={() => run(`approve-${s.id}`, () => postJSON(`/api/admin/submissions/${s.id}/approve`), "Recompensa aprobada y reservada")}
                    >
                      {spin(`approve-${s.id}`, Check)} Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={s.status === "rejected" || busy !== null}
                      onClick={() => run(`reject-${s.id}`, () => postJSON(`/api/admin/submissions/${s.id}/reject`), "Envío rechazado")}
                    >
                      {spin(`reject-${s.id}`, X)}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-medium">Recompensas</h3>
          {distributions.length === 0 && <p className="text-sm text-muted-foreground">Sin recompensas aprobadas.</p>}
          <div className="divide-y divide-border/50">
            {distributions.map((d) => {
              const p = byId.get(d.participant_id);
              return (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p?.display_name}</span>
                      <span className="tabular-nums">{fmt(d.amount)}</span>
                      <StatusBadge status={d.status} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Vistas {formatViews(d.views_from)} → {formatViews(d.views_to)} · reward_id {d.reward_id.slice(0, 10)}…
                    </p>
                    {d.error && <p className="text-[11px] text-red-300">{d.error}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {d.status === "paid" && d.tx_hash && (
                      <a href={explorerTx(d.tx_hash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        Ver en Stellar Expert <ExternalLink className="size-3" />
                      </a>
                    )}
                    {(d.status === "reserved" || d.status === "failed") && (
                      <>
                        <Button
                          size="sm"
                          disabled={!stellarReady || busy !== null}
                          title={stellarReady ? undefined : "Stellar no configurado"}
                          onClick={() => run(`pay-${d.id}`, () => postJSON(`/api/admin/distributions/${d.id}/payout`), "Pago confirmado on-chain")}
                        >
                          {spin(`pay-${d.id}`, Send)} {d.status === "failed" ? "Reintentar pago" : "Pagar on-chain"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy !== null}
                          onClick={() => run(`cancel-${d.id}`, () => postJSON(`/api/admin/distributions/${d.id}/cancel`), "Reserva liberada")}
                        >
                          {spin(`cancel-${d.id}`, Undo2)} Liberar
                        </Button>
                      </>
                    )}
                    {d.status === "submitted" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy !== null}
                        onClick={() => run(`check-${d.id}`, () => postJSON(`/api/admin/distributions/${d.id}/payout`), "Estado actualizado")}
                      >
                        {spin(`check-${d.id}`, RefreshCw)} Verificar estado
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  );
}
