import { CsvPanel } from "./csv-panel";

export default async function CsvPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; report?: string }>;
}) {
  const query = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Importar / Exportar</h1>
        <p className="text-muted-foreground">
          Intercambio de productos en CSV (separado por comas, cabeceras en
          español).
        </p>
      </div>
      <CsvPanel
        initialError={query.error}
        initialOk={query.ok}
        initialReport={query.report}
      />
    </div>
  );
}
