import { setBasketStatus } from "@/lib/actions/baskets";
import {
  catchMutation,
  redirectWithParams,
  safePath,
} from "@/lib/form-redirect";

export async function POST(request: Request) {
  const form = await request.formData();
  const basketId = Number(form.get("basketId"));
  const status = String(form.get("status") || "");
  const returnTo = safePath(
    form.get("returnTo"),
    Number.isFinite(basketId) ? `/cestas/${basketId}` : "/cestas",
  );

  try {
    const result = await setBasketStatus(basketId, status);
    if (result && "error" in result && result.error) {
      return redirectWithParams(request, returnTo, { error: result.error });
    }
    const ok =
      status === "active"
        ? "Receta activada."
        : status === "inactive"
          ? "Receta desactivada."
          : "Estado actualizado.";
    return redirectWithParams(request, returnTo, { ok });
  } catch (err) {
    return catchMutation(
      request,
      err,
      returnTo,
      "No se pudo cambiar el estado.",
    );
  }
}
