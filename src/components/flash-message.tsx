/** Server-rendered flash from 303 query params (Workers-safe). */
export function FlashMessage({
  error,
  ok,
}: {
  error?: string;
  ok?: string;
}) {
  if (error) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (ok) {
    return (
      <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
        {ok}
      </p>
    );
  }
  return null;
}
