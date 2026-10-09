#!/usr/bin/env node
/**
 * Flujo demo completo contra la app (UI -> backend -> contrato):
 *   login admin -> aprobar envíos seed (10.000 y 7.500 vistas) -> pagar on-chain (20 y 15 XLM).
 * Uso: node scripts/07-demo-app-flow.mjs [baseUrl=http://localhost:3000]
 * Lee ADMIN_PASSWORD de .env.local. No imprime secretos.
 */
import { readFileSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const SUBMISSIONS = [
  ["Ana Rivera", "33333333-3333-4333-8333-333333333331"],
  ["Bruno Méndez", "33333333-3333-4333-8333-333333333332"],
];

let cookie = "";
async function call(path, body) {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const data = await res.json();
  return { status: res.status, data };
}

const unauth = await call(`/api/admin/submissions/${SUBMISSIONS[0][1]}/approve`);
console.log(`• Sin sesión, aprobar -> HTTP ${unauth.status} (${unauth.data.error})`);

const login = await call("/api/admin/login", { password: env.ADMIN_PASSWORD });
if (login.status !== 200) throw new Error(`login falló: ${JSON.stringify(login.data)}`);
console.log("• Login admin OK");

for (const [name, id] of SUBMISSIONS) {
  const approve = await call(`/api/admin/submissions/${id}/approve`);
  if (approve.status !== 200) {
    console.log(`• Aprobar ${name}: HTTP ${approve.status} ${approve.data.error}`);
    continue;
  }
  const d = approve.data.distribution;
  console.log(`• Aprobado ${name}: ${Number(d.amount) / 1e7} XLM reservado (reward_id ${d.reward_id.slice(0, 12)}…)`);

  const again = await call(`/api/admin/submissions/${id}/approve`);
  console.log(`  Re-aprobar mismas vistas -> HTTP ${again.status} ${again.data.error ?? (again.data.idempotent ? "(idempotente)" : "")}`);

  const pay = await call(`/api/admin/distributions/${d.id}/payout`);
  if (pay.status !== 200) {
    console.log(`  Pago ${name}: HTTP ${pay.status} ${pay.data.error}`);
    continue;
  }
  console.log(`  Pago ${name}: ${pay.data.state} — ${pay.data.message}`);
  if (pay.data.distribution.tx_hash) {
    console.log(`  https://stellar.expert/explorer/testnet/tx/${pay.data.distribution.tx_hash}`);
  }
  const repay = await call(`/api/admin/distributions/${d.id}/payout`);
  console.log(`  Re-pagar -> HTTP ${repay.status} ${repay.data.message ?? repay.data.error}`);
}
