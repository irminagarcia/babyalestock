import { updateCategory } from "@/lib/actions/taxonomy";
import {
  catchMutation,
  redirectWithParams,
  safePath,
} from "@/lib/form-redirect";

/**
 * Classic form POST + 303 — Workers-safe (same pattern as product upsert).
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const returnTo = safePath(form.get("returnTo"), "/categorias");

  try {
    const result = await updateCategory(form);
    if (!result.ok) {
      return redirectWithParams(request, returnTo, { error: result.error });
    }
    return redirectWithParams(request, returnTo, {
      ok: `Categoría «${result.name}» actualizada.`,
    });
  } catch (err) {
    return catchMutation(
      request,
      err,
      returnTo,
      "No se pudo guardar la categoría.",
    );
  }
}
