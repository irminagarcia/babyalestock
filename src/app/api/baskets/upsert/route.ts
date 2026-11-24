import { saveBasketRecipe } from "@/lib/actions/baskets";
import {
  catchMutation,
  redirect303,
  redirectWithParams,
  safePath,
} from "@/lib/form-redirect";

export async function POST(request: Request) {
  const form = await request.formData();
  const returnTo = safePath(form.get("returnTo"), "/cestas/nueva");

  try {
    const result = await saveBasketRecipe({}, form);
    if (result.error) {
      return redirectWithParams(request, returnTo, { error: result.error });
    }
    if (!result.basketId) {
      return redirectWithParams(request, returnTo, {
        error: "No se pudo guardar la receta.",
      });
    }
    return redirect303(request, `/cestas/${result.basketId}`);
  } catch (err) {
    return catchMutation(
      request,
      err,
      returnTo,
      "No se pudo guardar la receta.",
    );
  }
}
