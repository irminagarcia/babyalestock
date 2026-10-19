# babyalestock — control de existencias de Baby Ale

Programa **interno** de control de stock para la boutique **Baby Ale** (no es una tienda en línea). Dos usuarios locales; interfaz en **español (es-ES)** e importes en **EUR**.

En pantalla el nombre de marca es **Baby Ale**. El identificador técnico del proyecto/paquete sigue siendo `babyalestock`.

## Requisitos

- Node.js 20+ (recomendado 22)
- npm

## Instalación rápida

```bash
npm install
npm run setup          # migraciones + usuarios semilla
npm run dev            # http://0.0.0.0:43123 (accesible en LAN)
```

Abra en el navegador: [http://127.0.0.1:43123](http://127.0.0.1:43123)

### Usuarios por defecto (cambiar tras el primer acceso)

| Usuario  | Contraseña | Rol sugerido        |
|----------|------------|---------------------|
| `admin`  | `admin123` | Administración      |
| `tienda` | `tienda123`| Personal de tienda  |

Puede definir contraseñas al sembrar:

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
- Importación / exportación CSV
- Esquema preparado para cestas, pedidos y WooCommerce (sin implementar aún)

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

Montaje de cestas con consumo de stock aún no implementado.

## Stack

Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · SQLite · Drizzle ORM
