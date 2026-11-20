import { NextResponse } from "next/server";
import { correctProductStock } from "@/lib/actions/stock-correction";

/** Classic form POST + 303 — reliable on OpenNext Cloudflare Workers. */
function absoluteUrl(request: Request, path: string): string {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "127.0.0.1:43123";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${proto}://${host}${normalized}`;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const productId = Number(form.get("productId"));
  const returnToRaw = String(form.get("returnTo") ?? "");
  const fallback =
    Number.isFinite(productId) && productId > 0
      ? `/productos/${productId}/editar`
      : "/productos";
  const returnTo =
    returnToRaw.startsWith("/") && !returnToRaw.startsWith("//")
      ? returnToRaw
      : fallback;

  try {
    const result = await correctProductStock(form);
    const url = new URL(absoluteUrl(request, returnTo));
    // Keep product-form ?error= free (BA-23); use stock* flash params.
    url.searchParams.delete("stockError");
    url.searchParams.delete("stockOk");

    if (!result.ok) {
      url.searchParams.set("stockError", result.error);
      return NextResponse.redirect(url, { status: 303 });
    }

    if (result.unchanged) {
      url.searchParams.set(
        "stockOk",
        "La cantidad coincide con las existencias actuales; no hubo cambios.",
      );
    } else {
      url.searchParams.set(
        "stockOk",
        `Existencias actualizadas a ${result.stockAfter}. Quedó registrado en Movimientos.`,
      );
    }
    return NextResponse.redirect(url, { status: 303 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.redirect(absoluteUrl(request, "/login"), {
        status: 303,
      });
    }
    const message =
      err instanceof Error && err.message
        ? err.message
        : "No se pudo corregir el stock.";
    const url = new URL(absoluteUrl(request, returnTo));
    url.searchParams.set("stockError", message);
    return NextResponse.redirect(url, { status: 303 });
  }
}
