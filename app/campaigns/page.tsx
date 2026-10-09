import Link from "next/link";
import { Plus } from "lucide-react";
import { CampaignCard } from "@/components/campaign-card";
import { buttonVariants } from "@/components/ui/button";
import { getPublicStatus } from "@/lib/config";
import { listCampaignViews } from "@/lib/services";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const [views, status] = [await listCampaignViews(), getPublicStatus()];
  const active = views.filter((v) => v.campaign.status === "active");
  const others = views.filter((v) => v.campaign.status !== "active");
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Campañas</h1>
          <p className="mt-1 text-muted-foreground">
            Únete, publica tu contenido y cobra en {status.tokenSymbol} por vistas verificadas.
          </p>
        </div>
        <Link href="/campaigns/new" className={cn(buttonVariants(), "gap-1")}>
          <Plus className="size-4" /> Crear campaña
        </Link>
      </div>

      {views.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          Aún no hay campañas.{" "}
          <Link href="/campaigns/new" className="text-primary underline">
            Crea la primera
          </Link>
          .
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((v) => (
              <CampaignCard key={v.campaign.id} view={v} symbol={status.tokenSymbol} />
            ))}
          </div>
          {others.length > 0 && (
            <>
              <h2 className="mt-12 text-lg font-medium text-muted-foreground">Pausadas o cerradas</h2>
              <div className="mt-4 grid gap-4 opacity-80 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((v) => (
                  <CampaignCard key={v.campaign.id} view={v} symbol={status.tokenSymbol} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
