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
          <li>
            Cambie las contraseñas por defecto en{" "}
            <strong>Cuenta / contraseña</strong>.
          </li>
          <li>Revise o cree Categorías y Proveedores.</li>
          <li>
            Añada Productos (o impórtelos por CSV; use la casilla Inventariar
            si necesita fijar existencias al coincidir por SKU).
          </li>
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
        <h2 className="font-display text-xl">Datos (local o nube)</h2>
        <p className="text-sm text-muted-foreground">
          En el PC de la tienda (doble clic), la base SQLite y las fotos viven en
          el directorio de datos (<code className="mx-1">BABYALESTOCK_DATA_DIR</code>,
          por defecto <code>~/.babyalestock</code>). Manténgalo fuera de carpetas
          sincronizadas (iCloud, Dropbox, OneDrive). En la versión en la nube
          (Cloudflare + Postgres), los datos están en la base remota; el login de
          la app sigue siendo <code>admin</code> / <code>tienda</code>.
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
            Editar la receta <strong>no descuenta stock</strong>. El consumo y el
            coste congelado ocurren solo al <strong>montar</strong>.
          </li>
        </ul>
      </section>

      <section className="space-y-2 rounded-xl border bg-card p-6">
        <h2 className="font-display text-xl">Montaje de cestas</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            En <strong>Montaje de cestas</strong> elija receta, cantidad y modo
            (preensamblada o bajo pedido).
          </li>
          <li>
            Al confirmar, se descuentan los componentes con movimientos de
            salida (clave de idempotencia) y se congelan coste e ingreso.
          </li>
          <li>
            Si falta stock de algún componente, se muestra el error en español y
            <strong> no se aplica ningún descuento parcial</strong>.
          </li>
          <li>
            Preensamblada aumenta el stock acabado de la cesta; bajo pedido solo
            consume componentes.
          </li>
          <li>
            Puede <strong>anular</strong> un montaje: movimientos compensatorios
            de entrada y exclusión de Rentabilidad → Registrado.
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
            <strong>Registrado</strong>: totales del periodo desde montajes
            confirmados (no anulados), con instantáneas congeladas.
          </li>
          <li>No sustituye a la contabilidad ni a liquidaciones fiscales.</li>
        </ul>
      </section>

      <section className="space-y-2 rounded-xl border bg-card p-6">
        <h2 className="font-display text-xl">Próximos hitos (aún no disponibles)</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Pedidos · Sincronización WooCommerce</li>
        </ul>
      </section>
    </div>
  );
}
