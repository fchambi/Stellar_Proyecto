import Link from "next/link";
import { Link2, Users } from "lucide-react";
import { BudgetBar } from "@/components/budget-bar";
import { PlatformBadge, StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatUnits } from "@/lib/money";
import type { CampaignView } from "@/lib/services";

export function CampaignCard({ view, symbol }: { view: CampaignView; symbol: string }) {
  const { campaign, totals, participants } = view;
  return (
    <Link href={`/campaigns/${campaign.id}`} className="group">
      <Card className="h-full transition-colors group-hover:ring-primary/40">
        <CardContent className="flex h-full flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="wavo-gradient grid size-10 shrink-0 place-items-center rounded-lg text-sm font-semibold text-white">
                {campaign.brand_name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{campaign.brand_name}</p>
                <h3 className="line-clamp-2 font-medium leading-snug">{campaign.title}</h3>
              </div>
            </div>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">{campaign.description}</p>
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-center">
            <Metric label="CPM" value={`${formatUnits(campaign.cpm)} ${symbol}`} />
            <Metric label="Presupuesto" value={`${formatUnits(campaign.budget)} ${symbol}`} />
            <Metric label="Máx/creador" value={campaign.max_reward > 0n ? `${formatUnits(campaign.max_reward)}` : "—"} />
          </div>
          <BudgetBar totals={totals} symbol={symbol} compact />
          <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" /> {participants.length} creadores
            </span>
            <span className="flex items-center gap-2">
              {campaign.contract_campaign_id && (
                <span className="flex items-center gap-1 text-emerald-300">
                  <Link2 className="size-3.5" /> On-chain #{campaign.contract_campaign_id}
                </span>
              )}
              <PlatformBadge platform={campaign.platform} />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
