import { formatUnits } from "@/lib/money";
import type { CampaignTotals } from "@/lib/rewards";

function pct(part: bigint, total: bigint): number {
  if (total <= 0n) return 0;
  return Number((part * 10_000n) / total) / 100;
}

export function BudgetBar({ totals, symbol, compact }: { totals: CampaignTotals; symbol: string; compact?: boolean }) {
  const paid = pct(totals.paid, totals.budget);
  const reserved = pct(totals.reserved, totals.budget);
  return (
    <div className="space-y-2">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        <div className="bg-emerald-400" style={{ width: `${paid}%` }} />
        <div className="bg-violet-400" style={{ width: `${reserved}%` }} />
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <Legend color="bg-emerald-400" label="Pagado" value={`${formatUnits(totals.paid)} ${symbol}`} />
          <Legend color="bg-violet-400" label="Reservado" value={`${formatUnits(totals.reserved)} ${symbol}`} />
          <Legend color="bg-muted-foreground/40" label="Disponible" value={`${formatUnits(totals.available)} ${symbol}`} />
        </div>
      )}
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${color}`} />
      {label}: <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}
