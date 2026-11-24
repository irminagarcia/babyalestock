import { saveDraftDelivery } from "@/lib/actions/deliveries";
import {
  catchMutation,
  redirect303,
  redirectWithParams,
  safePath,
} from "@/lib/form-redirect";

export async function POST(request: Request) {
  const form = await request.formData();
  const returnTo = safePath(form.get("returnTo"), "/entregas/nueva");

  try {
    const result = await saveDraftDelivery({}, form);
    if (result.error) {
      return redirectWithParams(request, returnTo, { error: result.error });
    }
    if (!result.deliveryId) {
      return redirectWithParams(request, returnTo, {
        error: "No se pudo guardar el borrador.",
      });
    }
    return redirect303(request, `/entregas/${result.deliveryId}`);
  } catch (err) {
    return catchMutation(
      request,
      err,
      returnTo,
      "No se pudo guardar el borrador.",
    );
  }
}
