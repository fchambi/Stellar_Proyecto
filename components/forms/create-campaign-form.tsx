"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { postJSON } from "@/lib/client-api";
import { formatViews, parseUnits } from "@/lib/money";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function CreateCampaignForm({ symbol }: { symbol: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    brand_name: "",
    description: "",
    platform: "any",
    rules: "",
    budget: "100",
    cpm: "2",
    max_reward: "50",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const maxViews = useMemo(() => {
    try {
      const b = parseUnits(form.budget);
      const c = parseUnits(form.cpm);
      return c > 0n ? (b * 1000n) / c : null;
    } catch {
      return null;
    }
  }, [form.budget, form.cpm]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { campaign } = await postJSON<{ campaign: { id: string } }>("/api/campaigns", form);
      toast.success("Campaña creada");
      router.push(`/campaigns/${campaign.id}`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-6">
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Título de la campaña" className="sm:col-span-2">
            <Input required minLength={3} value={form.title} onChange={set("title")} placeholder="Lanzamiento de nuestra nueva línea" />
          </Field>
          <Field label="Marca">
            <Input required minLength={2} value={form.brand_name} onChange={set("brand_name")} placeholder="Café Andino" />
          </Field>
          <Field label="Plataforma">
            <select className={selectClass} value={form.platform} onChange={set("platform")}>
              <option value="any">Todas (TikTok, Instagram, YouTube)</option>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
            </select>
          </Field>
          <Field label="Descripción" className="sm:col-span-2">
            <Textarea required minLength={10} rows={3} value={form.description} onChange={set("description")} placeholder="Qué tipo de contenido buscas" />
          </Field>
          <Field label="Reglas" className="sm:col-span-2">
            <Textarea rows={4} value={form.rules} onChange={set("rules")} placeholder={"1. Video original\n2. Mencionar @marca"} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label={`Presupuesto (${symbol})`}>
            <Input required inputMode="decimal" value={form.budget} onChange={set("budget")} />
          </Field>
          <Field label={`CPM (${symbol} por 1.000 vistas)`}>
            <Input required inputMode="decimal" value={form.cpm} onChange={set("cpm")} />
          </Field>
          <Field label={`Máximo por creador (${symbol})`}>
            <Input required inputMode="decimal" value={form.max_reward} onChange={set("max_reward")} />
          </Field>
          <p className="text-xs text-muted-foreground sm:col-span-3">
            {maxViews !== null
              ? `Este presupuesto cubre hasta ${formatViews(Number(maxViews))} vistas verificadas. Recompensa = floor(vistas nuevas × CPM / 1000). Usa 0 en máximo por creador para no limitar.`
              : "Ingresa montos válidos (máx. 7 decimales)."}
          </p>
          <p className="text-xs text-muted-foreground sm:col-span-3">
            Para pagos on-chain, la campaña debe crearse y financiarse en el contrato Soroban (scripts/04) y luego el admin la vincula con su ID on-chain.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading} className="h-9 px-4">
          {loading && <Loader2 className="size-4 animate-spin" />} Publicar campaña
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
