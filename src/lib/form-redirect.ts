import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/absolute-url";

/** True when Next.js `redirect()` threw (must rethrow from catch). */
export function isNextRedirect(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest: unknown }).digest === "string" &&
    String((err as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export function safePath(raw: unknown, fallback: string): string {
  const s = String(raw ?? "").trim();
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  return fallback;
}

export function redirect303(request: Request, path: string) {
  return NextResponse.redirect(absoluteUrl(request, path), { status: 303 });
}

export function redirectWithParams(
  request: Request,
  path: string,
  params: Record<string, string | undefined | null>,
) {
  const url = new URL(absoluteUrl(request, path));
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url, { status: 303 });
}

/** Catch UNAUTHORIZED / generic errors; rethrow Next redirects. */
export function catchMutation(
  request: Request,
  err: unknown,
  returnTo: string,
  fallbackMessage: string,
) {
  if (isNextRedirect(err)) throw err;
  if (err instanceof Error && err.message === "UNAUTHORIZED") {
    return redirect303(request, "/login");
  }
  const message =
    err instanceof Error && err.message && err.message !== "UNAUTHORIZED"
      ? err.message
      : fallbackMessage;
  return redirectWithParams(request, returnTo, { error: message });
}
