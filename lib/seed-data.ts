import type { Campaign, Participant, Submission } from "./types";

const UNIT = 10_000_000n;

/**
 * Datos demo: campaña de 100 unidades, CPM 2, dos creadores (10.000 y 7.500 vistas
 * verificadas => 20 y 15 unidades). Las direcciones son cuentas públicas de Testnet
 * creadas por `scripts/01-setup-accounts.sh`. `supabase/seed.sql` se genera desde aquí.
 */
export const SEED_CAMPAIGN_ID = "11111111-1111-4111-8111-111111111111";

export const SEED_ADDRESSES = {
  creator1: "GCKTEK6KZ7ISJL33J4TV4PECMELKA7E67IVFJ3NC66MAFBYJP2DPGU2O",
  creator2: "GCFALVRUZCESIXOJ2EWGW3OGZR5ZSMWMKU7LSBGVNDOBXUCXZDNWLJB2",
};

/**
 * ID de la campaña on-chain (financiada con scripts/04) a la que se vincula la campaña demo.
 * La campaña #1 de Testnet ya tiene los pagos de la verificación inicial; #3 queda limpia para la demo.
 */
export function demoOnchainCampaignId(): string {
  const v = process.env.DEMO_ONCHAIN_CAMPAIGN_ID?.trim();
  return v && /^\d{1,19}$/.test(v) ? v : "3";
}

/** Contrato SAC de XLM nativo en Testnet (`stellar contract id asset --asset native --network testnet`). */
export const TESTNET_NATIVE_SAC = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

export function seedData(): {
  campaigns: Campaign[];
  participants: Participant[];
  submissions: Submission[];
} {
  const created = "2026-10-09T15:00:00.000Z";
  const campaign: Campaign = {
    id: SEED_CAMPAIGN_ID,
    title: "Lanzamiento Café Andino: tu ritual de la mañana",
    description:
      "Crea un video corto mostrando cómo preparas tu café de la mañana con Café Andino. Buscamos contenido auténtico, en español, con buena luz y el producto visible en los primeros 3 segundos.",
    brand_name: "Café Andino",
    platform: "any",
    rules:
      "1. Video original de 15 a 60 segundos.\n2. Mencionar @cafeandino y #RitualAndino.\n3. Sin contenido engañoso ni bots: las vistas se verifican manualmente.\n4. Publicación pública durante al menos 30 días.",
    budget: 100n * UNIT,
    cpm: 2n * UNIT,
    max_reward: 50n * UNIT,
    status: "active",
    contract_campaign_id: demoOnchainCampaignId(),
    token_address: TESTNET_NATIVE_SAC,
    created_at: created,
  };
  const participants: Participant[] = [
    {
      id: "22222222-2222-4222-8222-222222222221",
      campaign_id: SEED_CAMPAIGN_ID,
      display_name: "Ana Rivera",
      stellar_address: SEED_ADDRESSES.creator1,
      joined_at: created,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      campaign_id: SEED_CAMPAIGN_ID,
      display_name: "Bruno Méndez",
      stellar_address: SEED_ADDRESSES.creator2,
      joined_at: created,
    },
  ];
  const submissions: Submission[] = [
    {
      id: "33333333-3333-4333-8333-333333333331",
      campaign_id: SEED_CAMPAIGN_ID,
      participant_id: participants[0].id,
      content_url: "https://www.tiktok.com/@anarivera/video/7420000000000000001",
      platform: "tiktok",
      status: "verified",
      verified_views: 10_000,
      rewarded_views: 0,
      pending_reward: 20n * UNIT,
      created_at: created,
    },
    {
      id: "33333333-3333-4333-8333-333333333332",
      campaign_id: SEED_CAMPAIGN_ID,
      participant_id: participants[1].id,
      content_url: "https://www.instagram.com/reel/C0wavoDemo2/",
      platform: "instagram",
      status: "verified",
      verified_views: 7_500,
      rewarded_views: 0,
      pending_reward: 15n * UNIT,
      created_at: created,
    },
  ];
  return { campaigns: [campaign], participants, submissions };
}
