export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Ayuda</h1>
        <p className="text-muted-foreground">
          Guía rápida de BabyAlestock (hito 1 — inventario local).
        </p>
      </div>

      <section className="space-y-2 rounded-xl border bg-card p-6">
        <h2 className="font-display text-xl">Cómo empezar</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>Inicie sesión con un usuario autorizado.</li>
          <li>Revise o cree Categorías y Proveedores.</li>
          <li>Añada Productos (o impórtelos por CSV).</li>
          <li>
            Registre Entradas de stock / Salidas / Ventas en Movimientos.
          </li>
          <li>
            Consulte el Panel para alertas de stock bajo y la lista de
            reposición.
          </li>
        </ol>
      </section>

      <section className="space-y-2 rounded-xl border bg-card p-6">
        <h2 className="font-display text-xl">Existencias</h2>
        <p className="text-sm text-muted-foreground">
          Las existencias iniciales se pueden indicar al crear el producto.
          Después, cambie el stock solo mediante movimientos para conservar un
          historial fiable. Si pulsa Guardar dos veces por error, la clave de
          idempotencia evita un doble descuento.
        </p>
      </section>

      <section className="space-y-2 rounded-xl border bg-card p-6">
        <h2 className="font-display text-xl">Archivar vs. borrar</h2>
        <p className="text-sm text-muted-foreground">
          Archivar oculta el producto del catálogo activo pero conserva todo el
          historial de movimientos. No hay borrado duro de productos con
          historial en este hito.
        </p>
      </section>

      <section className="space-y-2 rounded-xl border bg-card p-6">
        <h2 className="font-display text-xl">Datos locales</h2>
        <p className="text-sm text-muted-foreground">
          La base de datos SQLite y las fotos viven en el directorio de datos
          (<code className="mx-1">BABYALESTOCK_DATA_DIR</code> (por defecto{" "}
          <code>~/.babyalestock</code>). Manténgalo fuera de carpetas
          sincronizadas en la nube (iCloud, Dropbox, OneDrive).
        </p>
      </section>

      <section className="space-y-2 rounded-xl border bg-card p-6">
        <h2 className="font-display text-xl">Próximos hitos (aún no disponibles)</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Recetas de cestas regalo y consumo de componentes</li>
          <li>Pedidos</li>
          <li>Sincronización WooCommerce</li>
        </ul>
      </section>
    </div>
  );
}
