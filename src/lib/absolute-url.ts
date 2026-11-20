/** Build an absolute URL for 303 redirects that Workers/OpenNext handle reliably. */
export function absoluteUrl(request: Request, path: string): string {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "127.0.0.1:43123";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${proto}://${host}${normalized}`;
}
