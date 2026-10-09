"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, Send, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJSON } from "@/lib/client-api";
import { friendbotUrl } from "@/lib/stellar/explorer";

const ADDRESS_RE = /^G[A-Z2-7]{55}$/;
const storageKey = (campaignId: string) => `wavo:creator:${campaignId}`;
const noopSubscribe = () => () => {};

export function CreatorForms({ campaignId, active }: { campaignId: string; active: boolean }) {
  const router = useRouter();
  const savedRaw = useSyncExternalStore(
    noopSubscribe,
    () => localStorage.getItem(storageKey(campaignId)),
    () => null,
  );
  const saved = useMemo(
    () => (savedRaw ? (JSON.parse(savedRaw) as { name: string; address: string }) : null),
    [savedRaw],
  );
  const [nameInput, setName] = useState<string | null>(null);
  const [addressInput, setAddress] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [joinedNow, setJoined] = useState(false);
  const [busy, setBusy] = useState<"join" | "submit" | null>(null);
  const name = nameInput ?? saved?.name ?? "";
  const address = addressInput ?? saved?.address ?? "";
  const joined = joinedNow || saved !== null;

  const validAddress = ADDRESS_RE.test(address.trim());

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy("join");
    try {
      const res = await postJSON<{ alreadyJoined: boolean }>(`/api/campaigns/${campaignId}/join`, {
        display_name: name,
        stellar_address: address.trim(),
      });
      localStorage.setItem(storageKey(campaignId), JSON.stringify({ name, address: address.trim() }));
      setJoined(true);
      toast.success(res.alreadyJoined ? "Ya estabas registrado en esta campaña" : "¡Te uniste a la campaña!");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy("submit");
    try {
      await postJSON(`/api/campaigns/${campaignId}/submissions`, {
        stellar_address: address.trim(),
        content_url: url.trim(),
      });
      setUrl("");
      toast.success("Contenido enviado. Un admin verificará las vistas.");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!active) {
    return <p className="text-sm text-muted-foreground">Esta campaña no acepta nuevos participantes.</p>;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={join} className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="grid size-5 place-items-center rounded-full bg-primary/20 text-[11px] text-primary">1</span>
          Regístrate como creador
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre público</Label>
          <Input id="name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ana Rivera" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Dirección Stellar (Testnet)</Label>
          <Input
            id="address"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value.toUpperCase())}
            placeholder="G..."
            className="font-mono text-xs"
            aria-invalid={address.length > 0 && !validAddress}
          />
          <p className="text-[11px] text-muted-foreground">
            La cuenta debe existir en Testnet para recibir pagos.{" "}
            {validAddress && (
              <a href={friendbotUrl(address.trim())} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">
                Fondear con Friendbot <ExternalLink className="size-3" />
              </a>
            )}
          </p>
        </div>
        <Button type="submit" variant={joined ? "outline" : "default"} disabled={busy !== null || !validAddress} className="w-full">
          {busy === "join" ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          {joined ? "Registrado ✓ (actualizar)" : "Unirme a la campaña"}
        </Button>
      </form>

      <form onSubmit={submit} className="space-y-3 border-t border-border/60 pt-6">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="grid size-5 place-items-center rounded-full bg-primary/20 text-[11px] text-primary">2</span>
          Envía tu contenido
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="url">URL de TikTok, Instagram o YouTube</Label>
          <Input id="url" type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.tiktok.com/@tu_usuario/video/..." />
        </div>
        <Button type="submit" disabled={busy !== null || !joined || !validAddress} className="w-full">
          {busy === "submit" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Enviar para revisión
        </Button>
        {!joined && <p className="text-[11px] text-muted-foreground">Primero regístrate con tu dirección Stellar.</p>}
      </form>
    </div>
  );
}
