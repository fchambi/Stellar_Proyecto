import { cn } from "@/lib/utils";

const STYLES: Record<string, { label: string; className: string }> = {
  active: { label: "Activa", className: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  paused: { label: "Pausada", className: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
  closed: { label: "Cerrada", className: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30" },
  pending: { label: "Pendiente de revisión", className: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30" },
  verified: { label: "Vistas verificadas", className: "bg-sky-500/15 text-sky-300 ring-sky-500/30" },
  approved: { label: "Aprobado", className: "bg-violet-500/15 text-violet-300 ring-violet-500/30" },
  paid: { label: "Pagado", className: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  rejected: { label: "Rechazado", className: "bg-red-500/15 text-red-300 ring-red-500/30" },
  reserved: { label: "Reservado", className: "bg-violet-500/15 text-violet-300 ring-violet-500/30" },
  submitted: { label: "Enviado a Stellar", className: "bg-sky-500/15 text-sky-300 ring-sky-500/30" },
  failed: { label: "Falló (reintentable)", className: "bg-red-500/15 text-red-300 ring-red-500/30" },
  cancelled: { label: "Liberado", className: "bg-zinc-500/15 text-zinc-400 ring-zinc-500/30" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = STYLES[status] ?? { label: status, className: "bg-muted text-muted-foreground ring-border" };
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset",
        s.className,
        className,
      )}
    >
      {s.label}
    </span>
  );
}

const PLATFORM_LABEL: Record<string, string> = {
  any: "Todas las plataformas",
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
};

export function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span className="inline-flex h-5 items-center rounded-full bg-muted px-2 text-[11px] font-medium text-muted-foreground">
      {PLATFORM_LABEL[platform] ?? platform}
    </span>
  );
}
