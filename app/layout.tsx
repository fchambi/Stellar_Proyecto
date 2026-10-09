import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { ModeBanner } from "@/components/mode-banner";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wavo · Content Rewards en Stellar",
  description:
    "Wavo conecta marcas y creadores de Latinoamérica: campañas pagadas por vistas verificadas con pagos on-chain en Stellar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ModeBanner />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
          Wavo MVP · Stellar Testnet · Los tokens de Testnet no tienen valor real.
        </footer>
        <Toaster theme="dark" richColors position="top-right" />
      </body>
    </html>
  );
}
