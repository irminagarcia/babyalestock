export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Ayuda</h1>
        <p className="text-muted-foreground">
          Guía rápida del control de existencias de Baby Ale (gestión interna
          de stock).
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
        <h2 className="font-display text-xl">Entradas de proveedor y costes</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            <strong>Precio de compra</strong>: neto unitario de la línea de
            entrega.
          </li>
          <li>
            <strong>Portes y otros</strong>: se reparte entre líneas por valor
            neto (predeterminado) o por cantidad — nunca el mismo importe a cada
            producto por separado.
          </li>
          <li>
            <strong>IVA recuperable</strong>: se anota pero no entra en el coste
            de adquisición. El IVA no recuperable sí.
          </li>
          <li>
            <strong>Coste de adquisición</strong>: media ponderada al confirmar
            entregas.
          </li>
          <li>
            <strong>Beneficio estimado</strong>: precio de venta − coste de
            adquisición (estimación operativa, no contabilidad).
          </li>
        </ul>
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
        <h2 className="font-display text-xl">Cestas regalo (recetas)</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Una <strong>receta</strong> agrupa productos (y embalaje) con
            cantidades.
          </li>
          <li>
            El <strong>coste estimado</strong> = suma de (cantidad × coste de
            adquisición de cada componente).
          </li>
          <li>
            <strong>Beneficio / margen estimados</strong> a partir del precio de
            venta de la cesta (estimación operativa).
          </li>
          <li>
            Editar la receta <strong>no descuenta stock</strong> ni reescribe
            entregas o movimientos. El congelado de costes al montar cestas
            llegará más adelante.
          </li>
        </ul>
      </section>

      <section className="space-y-2 rounded-xl border bg-card p-6">
        <h2 className="font-display text-xl">Rentabilidad</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            <strong>Estimado</strong>: cartera de recetas y desgloses con costes
            de adquisición actuales.
          </li>
          <li>
            <strong>Registrado</strong>: totales del periodo cuando existan
            montajes/ventas de cesta guardados (aún no hay montaje en la app).
          </li>
          <li>No sustituye a la contabilidad ni a liquidaciones fiscales.</li>
        </ul>
      </section>

      <section className="space-y-2 rounded-xl border bg-card p-6">
        <h2 className="font-display text-xl">Próximos hitos (aún no disponibles)</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Montaje de cestas con consumo de componentes y coste congelado</li>
          <li>Pedidos · Sincronización WooCommerce</li>
        </ul>
      </section>
    </div>
  );
}
