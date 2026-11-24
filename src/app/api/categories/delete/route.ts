import { deleteCategory } from "@/lib/actions/taxonomy";
import {
  catchMutation,
  redirectWithParams,
  safePath,
} from "@/lib/form-redirect";

/**
 * Classic form POST + 303 — Workers-safe (same pattern as /api/products/delete).
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const categoryId = Number(form.get("categoryId"));
  const returnTo = safePath(form.get("returnTo"), "/categorias");

  try {
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      return redirectWithParams(request, returnTo, {
        error: "Categoría no válida.",
      });
    }

    const result = await deleteCategory(categoryId);
    if (!result.ok) {
      return redirectWithParams(request, returnTo, {
        error: result.error,
      });
    }

    return redirectWithParams(request, returnTo, {
      ok: `Categoría «${result.name}» eliminada.`,
    });
  } catch (err) {
    return catchMutation(
      request,
      err,
      returnTo,
      "No se pudo eliminar la categoría.",
    );
  }
}
