import { confirmDelivery } from "@/lib/actions/deliveries";
import {
  catchMutation,
  redirectWithParams,
  safePath,
} from "@/lib/form-redirect";

export async function POST(request: Request) {
  const form = await request.formData();
  const deliveryId = Number(form.get("deliveryId"));
  const returnTo = safePath(
    form.get("returnTo"),
    Number.isFinite(deliveryId) ? `/entregas/${deliveryId}` : "/entregas",
  );

  try {
    if (!Number.isFinite(deliveryId)) {
      return redirectWithParams(request, returnTo, {
        error: "Entrega no válida.",
      });
    }
    const result = await confirmDelivery(deliveryId);
    if (result.error) {
      return redirectWithParams(request, returnTo, { error: result.error });
    }
    return redirectWithParams(request, returnTo, {
      ok: result.success || "Entrega confirmada.",
    });
  } catch (err) {
    return catchMutation(
      request,
      err,
      returnTo,
      "No se pudo confirmar la entrega.",
    );
  }
}
