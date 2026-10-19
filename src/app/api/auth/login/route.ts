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

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";

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
    const url = new URL(absoluteUrl(request, "/login"));
    url.searchParams.set("error", result.error);
    url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
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
}
