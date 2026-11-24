import { cancelAssembly } from "@/lib/actions/assembly";
import {
  catchMutation,
  redirectWithParams,
  safePath,
} from "@/lib/form-redirect";

export async function POST(request: Request) {
  const form = await request.formData();
  const assemblyId = Number(form.get("assemblyId"));
  const returnTo = safePath(
    form.get("returnTo"),
    Number.isFinite(assemblyId) ? `/montaje/${assemblyId}` : "/montaje",
  );

  try {
    if (!Number.isFinite(assemblyId)) {
      return redirectWithParams(request, returnTo, {
        error: "Montaje no válido.",
      });
    }
    const result = await cancelAssembly(assemblyId);
    if (result.error) {
      return redirectWithParams(request, returnTo, { error: result.error });
    }
    return redirectWithParams(request, returnTo, {
      ok: result.success || "Montaje anulado.",
    });
  } catch (err) {
    return catchMutation(
      request,
      err,
      returnTo,
      "No se pudo anular el montaje.",
    );
  }
}
