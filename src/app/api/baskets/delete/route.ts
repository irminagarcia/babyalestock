import { deleteBasketRecipe } from "@/lib/actions/baskets";
import {
  catchMutation,
  redirectWithParams,
} from "@/lib/form-redirect";

export async function POST(request: Request) {
  const form = await request.formData();
  const basketId = Number(form.get("basketId"));

  try {
    if (!Number.isFinite(basketId)) {
      return redirectWithParams(request, "/cestas", {
        error: "Receta no válida.",
      });
    }
    await deleteBasketRecipe(basketId);
    return redirectWithParams(request, "/cestas", {
      ok: "Receta eliminada.",
    });
  } catch (err) {
    return catchMutation(
      request,
      err,
      "/cestas",
      "No se pudo eliminar la receta.",
    );
  }
}
