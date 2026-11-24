import { changeOwnPassword } from "@/lib/actions/auth";
import {
  catchMutation,
  redirectWithParams,
  safePath,
} from "@/lib/form-redirect";

export async function POST(request: Request) {
  const form = await request.formData();
  const returnTo = safePath(form.get("returnTo"), "/cuenta");

  try {
    const result = await changeOwnPassword(form);
    if (!result.ok) {
      return redirectWithParams(request, returnTo, { error: result.error });
    }
    return redirectWithParams(request, returnTo, { ok: result.message });
  } catch (err) {
    return catchMutation(
      request,
      err,
      returnTo,
      "No se pudo cambiar la contraseña.",
    );
  }
}
