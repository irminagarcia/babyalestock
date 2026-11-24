import Link from "next/link";
import { listActiveBasketsForAssembly } from "@/lib/actions/assembly";
import { Button } from "@/components/ui/button";
import { AssembleForm } from "./assemble-form";

export default async function NuevoMontajePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const baskets = await listActiveBasketsForAssembly();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Montar cestas</h1>
          <p className="text-muted-foreground">
            Confirme en una sola operación: consumo de componentes, coste e
            ingreso congelados. Si falta stock, no se aplica ningún descuento
            parcial.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/montaje">Historial</Link>
        </Button>
      </div>
      <AssembleForm baskets={baskets} initialError={query.error} />
    </div>
  );
}
