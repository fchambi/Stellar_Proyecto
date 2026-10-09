import { z } from "zod";
import {
  ADMIN_COOKIE,
  SESSION_TTL_SECONDS,
  checkPassword,
  createSessionToken,
  isAdminConfigured,
} from "@/lib/auth";
import { errorResponse, json, readJson } from "@/lib/http";

const schema = z.object({ password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  try {
    if (!isAdminConfigured()) {
      return json(
        { error: "Admin no configurado: define ADMIN_PASSWORD y ADMIN_SESSION_SECRET (32+ caracteres)" },
        503,
      );
    }
    const { password } = schema.parse(await readJson(req));
    if (!checkPassword(password)) return json({ error: "Contraseña incorrecta" }, 401);
    const res = json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, createSessionToken(), {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}
