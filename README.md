# babyalestock — control de existencias de Baby Ale

Programa **interno** de control de stock para la boutique **Baby Ale** (no es una tienda en línea). Dos usuarios locales; interfaz en **español (es-ES)** e importes en **EUR**.

En pantalla el nombre de marca es **Baby Ale**. El identificador técnico del proyecto/paquete sigue siendo `babyalestock`.

## Requisitos

- **Node.js LTS 20 o 22** (recomendado **22**). No use la versión «Current» (p. ej. 26): en Windows falla la instalación.
- npm (viene con Node)

Descarga: [https://nodejs.org](https://nodejs.org) → elija el botón verde **LTS** (no «Current»).

## Puesta en marcha (PC de la tienda)

```bash
git clone https://github.com/irminagarcia/babyalestock.git
cd babyalestock
npm install
npm run setup          # migraciones + usuarios semilla (solo la primera vez)
```

### Windows — si `npm install` falló antes

1. Desinstale Node «Current» (26.x) e instale **Node.js 22 LTS** desde [nodejs.org](https://nodejs.org).
2. Cierre y vuelva a abrir PowerShell / Símbolo del sistema.
3. Compruebe: `node -v` debe mostrar `v22.…` (no `v26.…`).
4. Reinstalación limpia:

```powershell
cd $HOME\babyalestock
git pull
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
npm run setup
npm run build
npm start
```

Use plain `npm install` (the repo includes `.npmrc` with `legacy-peer-deps=true`). If you still see `ERESOLVE`, run `npm install --legacy-peer-deps` once, then `git pull` again.

La base de datos usa **libsql** (binarios precompilados). No hace falta Python ni herramientas de Visual Studio.

Desarrollo / prueba rápida:

```bash
npm run dev            # http://0.0.0.0:43123 (accesible en LAN)
```

Uso diario más estable:

```bash
npm run build
npm start              # mismo puerto 43123
```

Abra en este PC: [http://127.0.0.1:43123](http://127.0.0.1:43123)  
Desde otro equipo en la misma red: `http://IP-DEL-PC:43123` (sustituya `IP-DEL-PC` por la IP local del ordenador que ejecuta la app).

### Usuarios por defecto (cámbielos el primer día)

| Usuario  | Contraseña | Rol sugerido        |
|----------|------------|---------------------|
| `admin`  | `admin123` | Administración      |
| `tienda` | `tienda123`| Personal de tienda  |

En la app: menú **Cuenta / contraseña** (o «Cambiar contraseña» en la sesión).
Cualquier usuario cambia la suya; `admin` puede restablecer la de `tienda`.

También al sembrar (antes del primer uso):

```bash
BABYALESTOCK_ADMIN_PASSWORD='***' BABYALESTOCK_SHOP_PASSWORD='***' npm run db:seed
```

## Directorio de datos (importante)

La base SQLite y las fotos **no** viven en el repositorio. Por defecto:

```text
~/.babyalestock/
  babyalestock.sqlite
  photos/
```

Configure otra ruta (recomendado: disco local, **fuera** de iCloud / Dropbox / OneDrive):

```bash
export BABYALESTOCK_DATA_DIR="$HOME/Documents/BabyAlestockData"
npm run setup
npm run dev
```

> **Aviso:** no sincronice la carpeta de datos con la nube: puede corromper SQLite.

## Acceso en red local (LAN)

El servidor escucha en `0.0.0.0:43123`. Desde otro equipo de la misma red:

```text
http://<IP-de-este-ordenador>:43123
```

Use solo en una red de confianza: la autenticación es de sesión con usuario/contraseña para dos cuentas locales.

Producción local:

```bash
npm run build
npm start
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo en `0.0.0.0:43123` |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run db:generate` | Generar migraciones Drizzle |
| `npm run db:migrate` | Aplicar migraciones SQL |
| `npm run db:seed` | Crear usuarios y taxonomía de ejemplo |
| `npm run setup` | Migrar + sembrar |

## Funciones del hito 1

- Catálogo dinámico (alta / edición / archivo; historial conservado)
- Movimientos: entradas, salidas, ventas, mermas, devoluciones, correcciones (con clave de idempotencia)
- Panel: totales, stock bajo, lista de reposición
- Búsqueda y filtros (categoría, marca, stock, uso)
- Categorías / subcategorías y proveedores dinámicos
- Importación / exportación CSV (casilla «Inventariar» para fijar existencias al coincidir por SKU)
- Cambio de contraseña en **Cuenta** (admin puede restablecer la de tienda)
- Esquema preparado para pedidos y WooCommerce (sin implementar aún)

## Hito 2 · Fase 1 — Coste de adquisición

- **Entradas de proveedor** (`/entregas`): cabecera (proveedor, fecha, portes, otros, método de reparto) + líneas (producto, cantidad, precio de compra, IVA %, recuperable/no recuperable)
- Reparto de portes/otros: por valor neto (predeterminado) o por cantidad — proporcional, nunca el mismo porte a cada producto por igual
- **Coste de adquisición unitario** = (neto línea + portes/otros asignados + IVA no recuperable) / cantidad; el IVA recuperable se registra aparte
- Al **confirmar** la entrega: recepción de stock vía movimientos existentes (idempotencia por línea) y actualización del coste de adquisición del producto por **media ponderada**
- En ficha de producto: precio de compra, coste de adquisición, precio de venta, **beneficio estimado** (venta − adquisición; estimación operativa)

```bash
npm run test:landed-cost   # ejemplos numéricos de la fórmula
```

### Fase 2 — Recetas de cestas regalo

- Rutas `/cestas`: nombre, SKU, descripción, precio de venta, estado, componentes + cantidades
- Coste estimado = Σ (cantidad × coste de adquisición del componente); beneficio y margen estimados
- Editar recetas no mueve stock ni reescribe historial; tablas stub para congelar costes en un futuro montaje
- Prueba: `npm run test:basket-cost`

### Fase 3 — Rentabilidad

- Ruta `/rentabilidad`: cartera de cestas (**Estimado**), periodo (**Registrado** cuando haya montajes), desglose de productos y cestas
- Etiquetas claras Estimado vs Registrado; sin P&L contable
- Prueba: `npm run test:profitability`

## Hito 3 — Montaje de cestas

- Rutas `/montaje`, `/montaje/nuevo`, `/montaje/[id]`: ensamblar N unidades desde una receta activa
- Consumo de componentes vía movimientos `removed` con claves `assembly:{id}:product:{pid}:consume` (sin doble descuento)
- Confirmación transaccional: stock insuficiente → error en español y rollback completo
- Instantánea de coste / precio de venta / nombre de receta; editar la receta no cambia montajes históricos
- Preensamblada aumenta `finished_stock`; bajo pedido (MTO) solo consume componentes
- Anulación con movimientos `received` compensatorios (`…:reverse`) y exclusión de Registrado
- Registrado en `/rentabilidad` agrega montajes no anulados del periodo
- Prueba: `npm run test:assembly`

## Stack

Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · SQLite (libsql) · Drizzle ORM
