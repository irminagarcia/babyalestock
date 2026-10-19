import { NextResponse } from "next/server";
import { login } from "@/lib/auth";

async function authenticate(username: string, password: string) {
  if (!username || !password) {
    return { ok: false as const, error: "Indique usuario y contraseña." };
  }
  return login(username, password);
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    const result = await authenticate(
      String(body?.username ?? ""),
      String(body?.password ?? ""),
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    return NextResponse.json({ ok: true, user: result.user });
  }

  const form = await request.formData();
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  const nextRaw = String(form.get("next") ?? "/panel");
  const next = nextRaw.startsWith("/") ? nextRaw : "/panel";

  const result = await authenticate(username, password);
  if (!result.ok) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", result.error);
    url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  }

  return NextResponse.redirect(new URL(next, request.url), { status: 303 });
}
