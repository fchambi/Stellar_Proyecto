"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJSON } from "@/lib/client-api";

export function AdminLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await postJSON("/api/admin/login", { password });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-primary" /> Acceso de administrador
        </CardTitle>
        <CardDescription>Solo el equipo de verificación de Wavo puede aprobar y pagar recompensas.</CardDescription>
      </CardHeader>
      <CardContent>
        {configured ? (
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pw">Contraseña</Label>
              <Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />} Entrar
            </Button>
          </form>
        ) : (
          <p className="text-sm text-amber-200">
            Admin no configurado. Define <code>ADMIN_PASSWORD</code> y <code>ADMIN_SESSION_SECRET</code> (32+ caracteres) en
            las variables de entorno del servidor.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await postJSON("/api/admin/logout");
        router.refresh();
      }}
    >
      <LogOut className="size-3.5" /> Salir
    </Button>
  );
}
