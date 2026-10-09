import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { NavLinks } from "@/components/nav-links";
import { WavoLogo } from "@/components/wavo-logo";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2">
          <WavoLogo />
        </Link>
        <NavLinks />
        <div className="ml-auto">
          <Link href="/campaigns/new" className={cn(buttonVariants({ size: "sm" }), "gap-1")}>
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Crear campaña</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
