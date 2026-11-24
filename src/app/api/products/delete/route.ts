import { deleteProduct } from "@/lib/actions/product-delete";
import {
  catchMutation,
  redirectWithParams,
  safePath,
} from "@/lib/form-redirect";

/**
 * Classic form POST + 303 — Workers-safe (same pattern as archive / BA-25).
 * Success lands on /productos?ok=…; failures return to the product with ?error=.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const productId = Number(form.get("productId"));
  const returnTo = safePath(
    form.get("returnTo"),
    Number.isFinite(productId) && productId > 0
      ? `/productos/${productId}`
      : "/productos",
  );

  try {
    if (!Number.isFinite(productId) || productId <= 0) {
      return redirectWithParams(request, returnTo, {
        error: "Producto no válido.",
      });
    }

    const result = await deleteProduct(productId);
    if (!result.ok) {
      return redirectWithParams(request, returnTo, {
        error: result.error,
      });
    }

    return redirectWithParams(request, "/productos", {
      ok: `Producto «${result.name}» eliminado.`,
    });
  } catch (err) {
    return catchMutation(
      request,
      err,
      returnTo,
      "No se pudo eliminar el producto.",
    );
  }
}
