import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    try {
      await getDb().delete(sessions).where(eq(sessions.id, sessionId));
    } catch {
      // ignore
    }
  }

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "127.0.0.1:43123";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const res = NextResponse.redirect(`${proto}://${host}/login`, {
    status: 303,
  });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0),
  });
  return res;
}
