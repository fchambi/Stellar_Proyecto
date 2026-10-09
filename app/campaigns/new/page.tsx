import { CreateCampaignForm } from "@/components/forms/create-campaign-form";
import { getPublicStatus } from "@/lib/config";

export const dynamic = "force-dynamic";

export default function NewCampaignPage() {
  const status = getPublicStatus();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Nueva campaña</h1>
      <p className="mt-1 text-muted-foreground">
        Define cuánto pagas por cada 1.000 vistas verificadas. Los montos se guardan como enteros en unidades mínimas
        ({status.tokenSymbol}, 7 decimales).
      </p>
      <CreateCampaignForm symbol={status.tokenSymbol} />
    </div>
  );
}
