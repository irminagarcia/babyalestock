import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/absolute-url";
import { upsertProduct } from "@/lib/actions/products";

/**
 * Classic form POST + 303 — same pattern as /api/auth/login.
 * Soft App Router navigation after a server action often fails on
 * OpenNext Cloudflare Workers even when the write succeeded.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const returnToRaw = String(form.get("returnTo") ?? "/productos/nuevo");
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/productos/nuevo";

  try {
    const result = await upsertProduct(form);
    if (!result.ok) {
      const url = new URL(absoluteUrl(request, returnTo));
      url.searchParams.set("error", result.error);
      return NextResponse.redirect(url, { status: 303 });
    }

    return NextResponse.redirect(
      absoluteUrl(request, `/productos/${result.id}`),
      { status: 303 },
    );
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.redirect(absoluteUrl(request, "/login"), {
        status: 303,
      });
    }
    const message =
      err instanceof Error && err.message && err.message !== "UNAUTHORIZED"
        ? err.message
        : "No se pudo guardar el producto.";
    const url = new URL(absoluteUrl(request, returnTo));
    url.searchParams.set("error", message);
    return NextResponse.redirect(url, { status: 303 });
  }
}
