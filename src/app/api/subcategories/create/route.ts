import { createSubcategory } from "@/lib/actions/taxonomy";
import {
  catchMutation,
  redirectWithParams,
  safePath,
} from "@/lib/form-redirect";

export async function POST(request: Request) {
  const form = await request.formData();
  const returnTo = safePath(form.get("returnTo"), "/categorias");

  try {
    const result = await createSubcategory(form);
    if (!result.ok) {
      return redirectWithParams(request, returnTo, { error: result.error });
    }
    return redirectWithParams(request, returnTo, {
      ok: "Subcategoría creada.",
    });
  } catch (err) {
    return catchMutation(
      request,
      err,
      returnTo,
      "No se pudo guardar la subcategoría.",
    );
  }
}
