import { absoluteUrl } from "@/lib/absolute-url";
import { correctProductStock } from "@/lib/actions/stock-correction";
import {
  isNextRedirect,
  redirect303,
  safePath,
  spanishMutationError,
} from "@/lib/form-redirect";
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

  const stockRedirect = (params: {
    stockError?: string;
    stockOk?: string;
  }) => {
    const url = new URL(absoluteUrl(request, returnTo));
    // Keep product-form ?error= free (BA-23); use stock* flash params.
    url.searchParams.delete("stockError");
    url.searchParams.delete("stockOk");
    url.searchParams.delete("error");
    if (params.stockError) url.searchParams.set("stockError", params.stockError);
    if (params.stockOk) url.searchParams.set("stockOk", params.stockOk);
    return NextResponse.redirect(url, { status: 303 });
  };

  try {
    const result = await correctProductStock(form);

    if (!result.ok) {
      return stockRedirect({ stockError: result.error });
    }

    if (result.unchanged) {
      return stockRedirect({
        stockOk:
          "La cantidad coincide con las existencias actuales; no hubo cambios.",
      });
    }

    return stockRedirect({
      stockOk: `Existencias actualizadas a ${result.stockAfter}. Quedó registrado en Movimientos.`,
    });
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return redirect303(request, "/login");
    }
    return stockRedirect({
      stockError: spanishMutationError(err, "No se pudo corregir el stock."),
    });
  }
}
