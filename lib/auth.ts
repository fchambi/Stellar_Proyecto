import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getServerConfig } from "./config";

export const ADMIN_COOKIE = "wavo_admin";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

function secrets() {
  const { password, sessionSecret } = getServerConfig().admin;
  if (!password || !sessionSecret || sessionSecret.length < 32) return null;
  return { password, sessionSecret };
}

export function isAdminConfigured(): boolean {
  return secrets() !== null;
}

const digest = (v: string) => createHash("sha256").update(v).digest();

export function checkPassword(candidate: string): boolean {
  const s = secrets();
  if (!s) return false;
  return timingSafeEqual(digest(candidate), digest(s.password));
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createSessionToken(): string {
  const s = secrets();
  if (!s) throw new Error("Admin no configurado");
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  return `${exp}.${sign(`admin.${exp}`, s.sessionSecret)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  const s = secrets();
  if (!s || !token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!Number.isInteger(exp) || exp < Date.now() / 1000 || !sig) return false;
  const expected = sign(`admin.${exp}`, s.sessionSecret);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isAdminSession(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}
