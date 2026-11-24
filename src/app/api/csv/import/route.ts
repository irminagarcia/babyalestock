import { importProductsCsv } from "@/lib/actions/csv-import";
import {
  catchMutation,
  redirectWithParams,
  safePath,
} from "@/lib/form-redirect";

export async function POST(request: Request) {
  const form = await request.formData();
  const returnTo = safePath(form.get("returnTo"), "/csv");

  try {
    const result = await importProductsCsv(form);
    if (!result.ok) {
      return redirectWithParams(request, returnTo, { error: result.error });
    }
    const ok = `Importación terminada: ${result.created} creados, ${result.updated} actualizados.`;
    const report = result.errors.length
      ? `Avisos:\n${result.errors.slice(0, 20).join("\n")}`
      : "Sin errores.";
    return redirectWithParams(request, returnTo, { ok, report });
  } catch (err) {
    return catchMutation(
      request,
      err,
      returnTo,
      "No se pudo importar el CSV.",
    );
  }
}
