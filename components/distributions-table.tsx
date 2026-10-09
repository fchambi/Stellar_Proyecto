import { ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatUnits, formatViews } from "@/lib/money";
import { explorerTx, shortAddress } from "@/lib/stellar/explorer";
import type { Participant, RewardDistribution } from "@/lib/types";

export function DistributionsTable({
  distributions,
  participants,
  symbol,
  campaignTitles,
}: {
  distributions: RewardDistribution[];
  participants: Participant[];
  symbol: string;
  campaignTitles?: Map<string, string>;
}) {
  if (distributions.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin recompensas aprobadas todavía.</p>;
  }
  const byId = new Map(participants.map((p) => [p.id, p]));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-normal">Creador</th>
            {campaignTitles && <th className="py-2 pr-3 font-normal">Campaña</th>}
            <th className="py-2 pr-3 font-normal">Vistas</th>
            <th className="py-2 pr-3 text-right font-normal">Monto</th>
            <th className="py-2 pr-3 font-normal">Estado</th>
            <th className="py-2 font-normal">Transacción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {distributions.map((d) => {
            const p = byId.get(d.participant_id);
            return (
              <tr key={d.id} className="align-middle">
                <td className="py-2.5 pr-3">
                  <div className="font-medium">{p?.display_name ?? "—"}</div>
                  {p && <div className="font-mono text-[11px] text-muted-foreground">{shortAddress(p.stellar_address, 5)}</div>}
                </td>
                {campaignTitles && (
                  <td className="max-w-48 truncate py-2.5 pr-3 text-xs text-muted-foreground">{campaignTitles.get(d.campaign_id)}</td>
                )}
                <td className="py-2.5 pr-3 text-xs text-muted-foreground tabular-nums">
                  {formatViews(d.views_from)} → {formatViews(d.views_to)}
                </td>
                <td className="py-2.5 pr-3 text-right font-medium tabular-nums">
                  {formatUnits(d.amount)} {symbol}
                </td>
                <td className="py-2.5 pr-3">
                  <StatusBadge status={d.status} />
                  {d.error && d.status === "failed" && <div className="mt-1 max-w-48 text-[11px] text-red-300">{d.error}</div>}
                </td>
                <td className="py-2.5 text-xs">
                  {d.status === "paid" && d.tx_hash ? (
                    <a href={explorerTx(d.tx_hash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      {shortAddress(d.tx_hash, 6)} <ExternalLink className="size-3" />
                    </a>
                  ) : d.status === "submitted" && d.tx_hash ? (
                    <span className="text-muted-foreground">Esperando confirmación…</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
