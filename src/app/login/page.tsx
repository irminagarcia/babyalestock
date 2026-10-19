import Image from "next/image";
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
          <div className="mx-auto flex justify-center">
            <Image
              src="/brand/baby-ale-logo.jpg"
              alt="Baby Ale"
              width={589}
              height={221}
              className="h-16 w-auto max-w-[280px] object-contain"
              priority
            />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Gestión interna de stock. Inicie sesión con su usuario autorizado
            para controlar productos y existencias.
          </p>
        </div>
        <LoginForm
          nextPath={params.next || "/panel"}
          initialError={params.error}
        />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acceso interno restringido a dos usuarios de la tienda (LAN de
          confianza). No es una tienda en línea.
        </p>
      </div>
    </div>
  );
}
