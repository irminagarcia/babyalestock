import { absoluteUrl } from "@/lib/absolute-url";
import { correctProductStock } from "@/lib/actions/stock-correction";
import { catchMutation, safePath } from "@/lib/form-redirect";
import { NextResponse } from "next/server";

/** Classic form POST + 303 — reliable on OpenNext Cloudflare Workers. */
export async function POST(request: Request) {
  const form = await request.formData();
  const productId = Number(form.get("productId"));
  const fallback =
    Number.isFinite(productId) && productId > 0
      ? `/productos/${productId}/editar`
      : "/productos";
  const returnTo = safePath(form.get("returnTo"), fallback);

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
    return catchMutation(
      request,
      err,
      returnTo,
      "No se pudo corregir el stock.",
    );
  }
}

