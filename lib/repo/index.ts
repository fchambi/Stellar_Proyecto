import "server-only";
import { getServerConfig } from "../config";
import { createMemoryRepo } from "./memory";
import { createSupabaseRepo } from "./supabase";
import type { Repo } from "./types";

let cached: Repo | null = null;

export function getRepo(): Repo {
  if (cached) return cached;
  const cfg = getServerConfig();
  cached = cfg.supabase
    ? createSupabaseRepo(cfg.supabase.url, cfg.supabase.serviceRoleKey)
    : createMemoryRepo();
  return cached;
}

export { RepoError } from "./types";
export type { Repo } from "./types";
