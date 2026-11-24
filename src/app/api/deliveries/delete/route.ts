import { deleteDraftDelivery } from "@/lib/actions/deliveries";
import {
  catchMutation,
  redirectWithParams,
} from "@/lib/form-redirect";

export async function POST(request: Request) {
  const form = await request.formData();
  const deliveryId = Number(form.get("deliveryId"));

  try {
    if (!Number.isFinite(deliveryId)) {
      return redirectWithParams(request, "/entregas", {
        error: "Entrega no válida.",
      });
    }
    const result = await deleteDraftDelivery(deliveryId);
    if ("error" in result && result.error) {
      return redirectWithParams(request, `/entregas/${deliveryId}`, {
        error: result.error,
      });
    }
    return redirectWithParams(request, "/entregas", {
      ok: "Borrador eliminado.",
    });
  } catch (err) {
    return catchMutation(
      request,
      err,
      "/entregas",
      "No se pudo eliminar el borrador.",
    );
  }
}
