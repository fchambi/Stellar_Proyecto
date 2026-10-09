import { Database, TriangleAlert } from "lucide-react";
import { getPublicStatus } from "@/lib/config";

export function ModeBanner() {
  const status = getPublicStatus();
  const notices: { icon: typeof Database; text: string }[] = [];
  if (status.dataMode === "memory") {
    notices.push({
      icon: Database,
      text: "Modo demo local: Supabase no está configurado. Los datos viven en memoria y se pierden al reiniciar (sin persistencia real).",
    });
  }
  if (!status.stellarReady) {
    notices.push({
      icon: TriangleAlert,
      text: "Stellar no está configurado: los pagos on-chain están desactivados. No se muestran transacciones simuladas.",
    });
  }
  if (notices.length === 0) return null;
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 text-amber-200">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-2 text-xs">
        {notices.map(({ icon: Icon, text }) => (
          <p key={text} className="flex items-start gap-2">
            <Icon className="mt-0.5 size-3.5 shrink-0" />
            {text}
          </p>
        ))}
      </div>
    </div>
  );
}
