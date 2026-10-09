import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAdminSession } from "./auth";
import { RepoError } from "./repo";

export class ServiceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Serializa bigint como string: nunca pasar montos por float. */
export function toJSONSafe<T>(value: T): unknown {
  return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(toJSONSafe(data), { status });
}

const REPO_STATUS: Record<RepoError["code"], number> = {
  not_found: 404,
  conflict: 409,
  stale_snapshot: 409,
  insufficient_budget: 422,
  max_reward_exceeded: 422,
  campaign_not_active: 422,
  not_cancellable: 409,
  unknown: 500,
};

const REPO_MESSAGES: Partial<Record<RepoError["code"], string>> = {
  stale_snapshot: "Las vistas cambiaron mientras aprobabas. Recarga y vuelve a intentar.",
  insufficient_budget: "Presupuesto insuficiente: aprobación bloqueada (no se prorratea).",
  max_reward_exceeded: "La recompensa supera el máximo por creador.",
  campaign_not_active: "La campaña no está activa.",
};

export function errorResponse(e: unknown) {
  if (e instanceof ServiceError) return json({ error: e.message }, e.status);
  if (e instanceof RepoError) {
    return json({ error: REPO_MESSAGES[e.code] ?? e.message }, REPO_STATUS[e.code]);
  }
  if (e instanceof ZodError) {
    return json({ error: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, 400);
  }
  console.error(e);
  return json({ error: e instanceof Error ? e.message : "Error inesperado" }, 500);
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ServiceError(400, "Cuerpo JSON inválido");
  }
}

export function route<C>(handler: (req: Request, ctx: C) => Promise<unknown>) {
  return async (req: Request, ctx: C) => {
    try {
      return json(await handler(req, ctx));
    } catch (e) {
      return errorResponse(e);
    }
  };
}

/** Igual que `route` pero exige sesión de admin válida (cookie HMAC). */
export function adminRoute<C>(handler: (req: Request, ctx: C) => Promise<unknown>) {
  return async (req: Request, ctx: C) => {
    if (!(await isAdminSession())) return json({ error: "No autorizado" }, 401);
    try {
      return json(await handler(req, ctx));
    } catch (e) {
      return errorResponse(e);
    }
  };
}
