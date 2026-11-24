import { confirmAssembly } from "@/lib/actions/assembly";
import {
  catchMutation,
  redirect303,
  redirectWithParams,
  safePath,
} from "@/lib/form-redirect";

export async function POST(request: Request) {
  const form = await request.formData();
  const returnTo = safePath(form.get("returnTo"), "/montaje/nuevo");

  try {
    const result = await confirmAssembly({}, form);
    if (result.error) {
      return redirectWithParams(request, returnTo, { error: result.error });
    }
    if (!result.assemblyId) {
      return redirectWithParams(request, returnTo, {
        error: "No se pudo registrar el montaje.",
      });
    }
    return redirect303(request, `/montaje/${result.assemblyId}`);
  } catch (err) {
    return catchMutation(
      request,
      err,
      returnTo,
      "No se pudo confirmar el montaje.",
    );
  }
}
