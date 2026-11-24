import { recordMovement } from "@/lib/actions/movements";
import {
  catchMutation,
  redirectWithParams,
  safePath,
} from "@/lib/form-redirect";

export async function POST(request: Request) {
  const form = await request.formData();
  const returnTo = safePath(form.get("returnTo"), "/movimientos");

  try {
    const result = await recordMovement(form);
    if (!result.ok) {
      return redirectWithParams(request, returnTo, { error: result.error });
    }
    if (result.duplicate) {
      return redirectWithParams(request, returnTo, {
        ok: "Movimiento ya registrado (clave de idempotencia).",
      });
    }
    return redirectWithParams(request, returnTo, {
      ok: `Movimiento guardado. Existencias actuales: ${result.stockAfter}.`,
    });
  } catch (err) {
    return catchMutation(
      request,
      err,
      returnTo,
      "No se pudo registrar el movimiento.",
    );
  }
}
