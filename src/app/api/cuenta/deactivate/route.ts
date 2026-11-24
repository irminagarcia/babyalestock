import { adminDeactivateUser } from "@/lib/actions/auth";
import {
  catchMutation,
  redirectWithParams,
  safePath,
} from "@/lib/form-redirect";

/** Classic form POST + 303 — Workers-safe. Soft-deactivate only (no hard delete). */
export async function POST(request: Request) {
  const form = await request.formData();
  const returnTo = safePath(form.get("returnTo"), "/cuenta");

  try {
    const result = await adminDeactivateUser(form);
    if (!result.ok) {
      return redirectWithParams(request, returnTo, {
        error: result.error,
        form: "deactivate",
      });
    }
    return redirectWithParams(request, returnTo, {
      ok: result.message,
      form: "deactivate",
    });
  } catch (err) {
    return catchMutation(
      request,
      err,
      returnTo,
      "No se pudo desactivar el usuario.",
    );
  }
}
