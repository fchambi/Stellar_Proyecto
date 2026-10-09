import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Coins,
  Eye,
  Link2,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: Megaphone,
    title: "La marca lanza una campaña",
    text: "Define presupuesto, CPM, plataforma, reglas y máximo por creador. El presupuesto queda en custodia en un contrato Soroban.",
  },
  {
    icon: Sparkles,
    title: "Creadores publican",
    text: "Se unen con su dirección Stellar y envían su video de TikTok, Instagram o YouTube.",
  },
  {
    icon: Eye,
    title: "Vistas verificadas",
    text: "Un admin revisa el contenido y registra vistas verificadas. Solo se pagan vistas nuevas desde el último pago.",
  },
  {
    icon: Coins,
    title: "Pago on-chain",
    text: "El contrato distribuye la recompensa con un reward_id único. Sin doble pago y con enlace al explorer.",
  },
];

const GUARANTEES = [
  { icon: ShieldCheck, title: "Fondos en custodia", text: "El presupuesto vive en el contrato y cada pago se valida contra su saldo." },
  { icon: BadgeCheck, title: "Sin promesas vacías", text: "Si no alcanza el presupuesto, la aprobación se bloquea. Nada de prorrateos." },
  { icon: Link2, title: "Transparencia", text: "Cada pago confirmado enlaza a su transacción en Stellar Expert." },
  { icon: Wallet, title: "Pagos globales", text: "Creadores de toda LATAM cobran en segundos con fees mínimos." },
];

export default function Home() {
  return (
    <div>
      <section className="wavo-glow relative overflow-hidden border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 pt-20 pb-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Content Rewards · Stellar Testnet
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Paga a creadores por <span className="wavo-gradient-text">resultados verificados</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Wavo es la plataforma de la economía de creadores en Latinoamérica. Las marcas financian campañas,
            los creadores generan vistas y los pagos se liquidan on-chain en Stellar.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/campaigns" className={cn(buttonVariants({ size: "lg" }), "h-10 px-5")}>
              Explorar campañas <ArrowRight className="size-4" />
            </Link>
            <Link href="/campaigns/new" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-10 px-5")}>
              Soy una marca
            </Link>
          </div>
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-3 gap-4 text-left">
            {[
              ["CPM", "Recompensa por cada 1.000 vistas verificadas"],
              ["Soroban", "Contrato que custodia y distribuye fondos"],
              ["5 s", "Tiempo aproximado de confirmación en Stellar"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border/60 bg-card/50 p-4">
                <div className="text-lg font-semibold">{k}</div>
                <div className="mt-1 text-xs text-muted-foreground">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-2xl font-semibold tracking-tight">Cómo funciona</h2>
        <p className="mt-2 text-muted-foreground">Validación off-chain, pago on-chain. Cada etapa separada y auditable.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Card key={s.title}>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
                    <s.icon className="size-4" />
                  </span>
                  <span className="text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="font-medium">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border/60 bg-card/30">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {GUARANTEES.map((g) => (
            <div key={g.title} className="space-y-2">
              <g.icon className="size-5 text-primary" />
              <h3 className="font-medium">{g.title}</h3>
              <p className="text-sm text-muted-foreground">{g.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
