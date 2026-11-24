import { NextResponse } from "next/server";
import {
  createSession,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";

function absoluteUrl(request: Request, path: string) {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "127.0.0.1:43123";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${proto}://${host}${normalized}`;
}

function loginErrorRedirect(request: Request, next: string, error: string) {
  const url = new URL(absoluteUrl(request, "/login"));
  url.searchParams.set("error", error);
  url.searchParams.set("next", next);
  return NextResponse.redirect(url, { status: 303 });
}

function safeLoginError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (msg.includes("DATABASE_URL")) {
    return msg;
  }
  // Neon suspended / network / WebSocket — keep Spanish, no secrets.
  if (/fetch failed|WebSocket|ECONNREFUSED|timeout|neon/i.test(msg)) {
    return "No se pudo conectar a la base de datos (Neon). Comprueba que el proyecto Neon esté activo y que DATABASE_URL sea correcto en el Worker.";
  }
  return "No se pudo iniciar sesión (error del servidor). Si acabas de redesplegar, verifica DATABASE_URL y que el tráfico del deploy esté al 100%.";
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => null);
      const result = await createSession(
        String(body?.username ?? ""),
        String(body?.password ?? ""),
      );
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 401 });
      }
      const res = NextResponse.json({ ok: true, user: result.user });
      res.cookies.set(
        SESSION_COOKIE,
        result.sessionId,
        sessionCookieOptions(result.expires),
      );
      return res;
    }

    const form = await request.formData();
    const username = String(form.get("username") ?? "");
    const password = String(form.get("password") ?? "");
    const nextRaw = String(form.get("next") ?? "/panel");
    const next = nextRaw.startsWith("/") ? nextRaw : "/panel";

    const result = await createSession(username, password);
    if (!result.ok) {
      return loginErrorRedirect(request, next, result.error);
    }

    const res = NextResponse.redirect(absoluteUrl(request, next), {
      status: 303,
    });
    res.cookies.set(
      SESSION_COOKIE,
      result.sessionId,
      sessionCookieOptions(result.expires),
    );
    return res;
  } catch (err) {
    console.error("auth/login failed:", err);
    if (contentType.includes("application/json")) {
      return NextResponse.json(
        { error: safeLoginError(err) },
        { status: 500 },
      );
    }
    const nextRaw = "/panel";
    return loginErrorRedirect(request, nextRaw, safeLoginError(err));
  }
}
