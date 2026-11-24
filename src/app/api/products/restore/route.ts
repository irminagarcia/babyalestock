import { restoreProduct } from "@/lib/actions/products";
import {
  catchMutation,
  redirectWithParams,
  safePath,
} from "@/lib/form-redirect";

export async function POST(request: Request) {
  const form = await request.formData();
  const productId = Number(form.get("productId"));
  const returnTo = safePath(
    form.get("returnTo"),
    Number.isFinite(productId) ? `/productos/${productId}` : "/productos",
  );

  try {
    if (!Number.isFinite(productId)) {
      return redirectWithParams(request, returnTo, {
        error: "Producto no válido.",
      });
    }
    await restoreProduct(productId);
    return redirectWithParams(request, returnTo, {
      ok: "Producto restaurado.",
    });
  } catch (err) {
    return catchMutation(
      request,
      err,
      returnTo,
      "No se pudo restaurar el producto.",
    );
  }
}
