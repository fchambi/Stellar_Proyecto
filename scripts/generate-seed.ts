/**
 * Genera supabase/seed.sql a partir de lib/seed-data.ts (misma fuente que el modo demo local).
 * Uso: pnpm seed:generate
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { seedData } from "../lib/seed-data";

const q = (v: string | null) => (v === null ? "null" : `'${v.replace(/'/g, "''")}'`);
const { campaigns, participants, submissions } = seedData();

const lines: string[] = [
  "-- Generado por scripts/generate-seed.ts. No editar a mano.",
  "-- Campaña demo: presupuesto 100 XLM (1.000.000.000 stroops), CPM 2 XLM, máx. 50 XLM por creador.",
  "begin;",
];

for (const c of campaigns) {
  lines.push(
    `insert into public.campaigns (id, title, description, brand_name, platform, rules, budget, cpm, max_reward, status, contract_campaign_id, token_address, created_at) values (${q(c.id)}, ${q(c.title)}, ${q(c.description)}, ${q(c.brand_name)}, ${q(c.platform)}, ${q(c.rules)}, ${c.budget}, ${c.cpm}, ${c.max_reward}, ${q(c.status)}, ${q(c.contract_campaign_id)}, ${q(c.token_address)}, ${q(c.created_at)}) on conflict (id) do nothing;`,
  );
}
for (const p of participants) {
  lines.push(
    `insert into public.participants (id, campaign_id, display_name, stellar_address, joined_at) values (${q(p.id)}, ${q(p.campaign_id)}, ${q(p.display_name)}, ${q(p.stellar_address)}, ${q(p.joined_at)}) on conflict (id) do nothing;`,
  );
}
for (const s of submissions) {
  lines.push(
    `insert into public.submissions (id, campaign_id, participant_id, content_url, platform, status, verified_views, rewarded_views, pending_reward, created_at) values (${q(s.id)}, ${q(s.campaign_id)}, ${q(s.participant_id)}, ${q(s.content_url)}, ${q(s.platform)}, ${q(s.status)}, ${s.verified_views}, ${s.rewarded_views}, ${s.pending_reward}, ${q(s.created_at)}) on conflict (id) do nothing;`,
  );
}
lines.push("commit;", "");

const out = join(process.cwd(), "supabase", "seed.sql");
writeFileSync(out, lines.join("\n"));
console.log(`seed escrito en ${out}`);
