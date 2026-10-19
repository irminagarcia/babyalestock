import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="animate-fade-up w-full max-w-md rounded-2xl border bg-card/90 p-8 shadow-sm backdrop-blur">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl text-primary">BabyAlestock</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Inventario local para su boutique de bebé. Inicie sesión para
            gestionar productos y existencias.
          </p>
        </div>
        <LoginForm
          nextPath={params.next || "/panel"}
          initialError={params.error}
        />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acceso restringido a usuarios autorizados de la tienda (LAN de
          confianza).
        </p>
      </div>
    </div>
  );
}
