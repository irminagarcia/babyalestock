import { updateOwnProfile } from "@/lib/actions/auth";
import {
  catchMutation,
  redirectWithParams,
  safePath,
} from "@/lib/form-redirect";

export async function POST(request: Request) {
  const form = await request.formData();
  const returnTo = safePath(form.get("returnTo"), "/cuenta");

  try {
    const result = await updateOwnProfile(form);
    if (!result.ok) {
      return redirectWithParams(request, returnTo, {
        error: result.error,
        form: "profile",
      });
    }
    return redirectWithParams(request, returnTo, {
      ok: result.message,
      form: "profile",
    });
  } catch (err) {
    return catchMutation(
      request,
      err,
      returnTo,
      "No se pudo guardar el perfil.",
    );
  }
}
