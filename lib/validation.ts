import { z } from "zod";
import type { Platform } from "./types";

export const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

export function detectPlatform(rawUrl: string): Platform | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^www\.|^m\./, "");
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
  if (host === "instagram.com") return "instagram";
  if (host === "youtube.com" || host === "youtu.be") return "youtube";
  return null;
}

const amount = z
  .string()
  .trim()
  .regex(/^\d+([.,]\d{1,7})?$/, "Monto inválido (máx. 7 decimales)");

export const campaignSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  brand_name: z.string().trim().min(2).max(80),
  platform: z.enum(["any", "tiktok", "instagram", "youtube"]),
  rules: z.string().trim().max(2000).default(""),
  budget: amount,
  cpm: amount,
  max_reward: amount,
});

export const joinSchema = z.object({
  display_name: z.string().trim().min(2).max(60),
  stellar_address: z.string().trim().regex(STELLAR_ADDRESS_RE, "Dirección Stellar inválida (G...)"),
});

export const submissionSchema = z.object({
  stellar_address: z.string().trim().regex(STELLAR_ADDRESS_RE, "Dirección Stellar inválida (G...)"),
  content_url: z.string().trim().url("URL inválida").max(500),
});

export const viewsSchema = z.object({
  verified_views: z.coerce.number().int().min(0).max(1_000_000_000_000),
});

export const linkSchema = z.object({
  contract_campaign_id: z.string().trim().regex(/^\d{1,19}$/, "ID on-chain debe ser un entero u64"),
});

export const statusSchema = z.object({
  status: z.enum(["active", "paused", "closed"]),
});
