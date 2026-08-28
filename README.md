# Tablero — Control de vehículo

App web para llevar el mantenimiento, las cargas de combustible y la VTV de **uno o varios
vehículos**. Solo frontend: **no hay backend, ni usuarios, ni base de datos**. Todo se guarda en
el `localStorage` del navegador y se puede exportar/importar como archivo JSON.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- react-router-dom
- lucide-react (íconos)
- recharts (gráficos)

## Instalación

```bash
npm install
npm run dev     # http://localhost:5173
```

Otros scripts:

```bash
npm run build     # typecheck + build de producción en dist/
npm run preview   # sirve el build local
npm run lint      # solo typecheck (tsc --noEmit)
```

## Cómo se guardan los datos

Todo vive en una sola clave de `localStorage`: **`vehiculo-data-v1`** (el sufijo del nombre es
histórico: identifica el slot, no el schema). El schema actual es **`version: 3`**. El hook
[`useLocalStorage`](src/hooks/useLocalStorage.ts) escribe con *debounce* de 400 ms y hace un
*flush* final al cerrar u ocultar la pestaña, así no se pierde el último cambio.

```ts
{
  version: 3,
  vehiculos: Vehiculo[],        // cada uno con su id
  vehiculoActivoId: string | null,
  services: Service[],          // cada registro con vehiculoId
  cargasCombustible: CargaCombustible[],
  lecturasTanque: LecturaTanque[],
  vtv: RegistroVTV[]
}
```

### Migraciones

`migrar()` en [`src/lib/storage.ts`](src/lib/storage.ts) es el único punto de migración y corre
en cada lectura (del storage o de un backup importado). De v1 a v2:

- el `vehiculo` suelto pasa a ser el primer elemento de `vehiculos`, con un id nuevo;
- todos los services, cargas y VTV existentes quedan asociados a ese id;
- si el v1 estaba vacío, arranca sin vehículos en vez de crear uno fantasma;
- registros con un `vehiculoId` que ya no existe se adoptan por el primer vehículo.

De v2 a v3 aparece `lecturasTanque`, que arranca vacío; nada más cambia.

Es idempotente: volver a migrar no cambia nada.

> **Importante:** si borrás los datos de navegación o cambiás de dispositivo, los datos se
> pierden. Usá **Vehículos → Copia de seguridad → Exportar backup** cada tanto. El backup
> incluye todos los vehículos, no sólo el activo.

## Secciones

| Sección | Qué hace |
| --- | --- |
| **Tablero** | Odómetro editable en el lugar, VTV con semáforo, alertas de mantenimiento, autonomía y gastos del mes/año. |
| **Vehículos** | Alta/edición/baja de varios vehículos, selección del activo + exportar/importar/borrar datos. |
| **Services** | Alta/edición/baja, filtro por tipo, próximo km y fecha **calculados automáticamente**. |
| **Combustible** | Cargas por monto pagado y tipo de nafta, mediciones del tanque sin cargar, nivel actual estimado, km/L por tramo y gráficos. |
| **VTV** | Historial, resultado y cálculo automático de vigente / por vencer / vencida. |

## Cómo se carga una nafta

Se carga como se paga en la estación: **litros del ticket + total pagado**. El precio por litro
no se ingresa, se deriva:

```
precioPorLitro = total / litros
```

Queda guardado en el registro para los gráficos, pero es un valor calculado: si editás el total
o los litros, se recalcula solo.

Cada carga lleva además el **tipo de nafta** (súper o premium). El gráfico de precio dibuja una
línea por tipo en vez de una sola: mezclar súper y premium en una serie hace ver saltos de precio
que no existen. Las cargas guardadas antes de que existiera este campo se agrupan aparte como
"Sin especificar" — no se les asume un tipo.

## Nivel del tanque y mediciones

Se puede registrar el **nivel de la aguja sin cargar nafta**: fecha, kilometraje y posición del
medidor. Con eso la app estima cuánta nafta queda ahora, haciendo un balance desde el último
nivel conocido:

```
litros = nivelReferencia × capacidad
       + litros cargados después de esa referencia
       − (kmActual − kmReferencia) / (km por litro)
```

La *referencia* es el evento más reciente cuyo nivel se conoce con certeza: una medición, una
carga a tanque lleno, o una carga estimada con el medidor. Una carga parcial cargada por ticket
**no** sirve de referencia — sabe cuántos litros entraron, pero no en qué nivel quedó la aguja.
El resultado se recorta siempre a `[0, capacidad]`.

Necesita dos cosas: la capacidad del tanque (ficha del vehículo) y una autonomía medida. Cuando
falta alguna, la app dice cuál en vez de mostrar un número inventado.

### Consumo sin llenar nunca el tanque

Entre dos mediciones consecutivas también se puede medir el consumo:

```
litros = (nivelDesde − nivelHasta) × capacidad + litros cargados en el medio
km/L   = (kmHasta − kmDesde) / litros
```

Se muestra aparte y marcado como estimado: **la aguja no es lineal**, así que es menos preciso
que el full-to-full. Si hay ambos, el full-to-full manda. Los tramos imposibles (la aguja sube
sin que haya habido una carga, o el kilometraje no avanzó) se descartan.

## Cómo se calcula la autonomía

Método *full-to-full*: los litros de una carga son los que se consumieron **desde la carga
anterior**.

```
km/L = (km de esta carga − km de la carga anterior) / litros de esta carga
```

Un tramo se considera **confiable** solo si:

1. ambas cargas dejaron el tanque lleno (`tanqueLleno: true`),
2. ninguna de las dos tiene litros estimados con el medidor, y
3. el kilometraje avanzó.

Los tramos no confiables se muestran igual, marcados y con el motivo, pero quedan fuera del
promedio y del gráfico. El promedio del tablero usa los últimos 5 tramos confiables.

## Próximo service automático

Al cargar un service, los campos "próximo km" y "próxima fecha" se completan solos a partir del
tipo, el kilometraje y la fecha, usando la tabla de
[`src/data/intervalos.ts`](src/data/intervalos.ts):

| Tipo | km | meses |
| --- | ---: | ---: |
| Cambio de aceite y filtro | 10.000 | 12 |
| Filtro de aire | 20.000 | 24 |
| Filtro de habitáculo | 20.000 | 12 |
| Filtro de combustible | 30.000 | 24 |
| Bujías | 40.000 | — |
| Frenos | 40.000 | — |
| Correa de distribución | 60.000 | 60 |
| Neumáticos | 50.000 | — |
| Alineación y balanceo | 15.000 | 12 |
| Batería | — | 48 |
| Amortiguadores | 80.000 | — |
| Embrague | 100.000 | — |
| Refrigerante | 60.000 | 48 |
| Service general | 10.000 | 12 |

Son intervalos **genéricos para nafteros de uso urbano/mixto**: el manual del fabricante manda.
En cuanto tocás uno de los dos campos, deja de recalcularse; el botón "Sugerido" vuelve al valor
de la tabla.

## ¿Hay una API de autos para autocompletar?

Para el mercado argentino, **no** hay ninguna gratuita, con CORS y sin API key:

| Opción | Por qué no sirve acá |
| --- | --- |
| NHTSA vPIC | Gratis, sin key y con CORS, pero es base de EE.UU.: a un Gol brasileño le devuelve poco más que la marca. |
| CarQuery | Tiene specs con capacidad de tanque, pero quedó detrás de key y sin CORS (JSONP). |
| API-Ninjas / CarsXE / Auto.dev | Requieren API key, que en una app 100% frontend queda expuesta en el bundle. |
| Infoauto y similares (AR) | Pagas y con autenticación. No hay API pública de patente → datos del vehículo. |

La alternativa implementada es un **catálogo local** en
[`src/data/catalogo.ts`](src/data/catalogo.ts) con los modelos más comunes en Argentina. Al
escribir marca y modelo, precarga capacidad de tanque y carrocería. Sin red, sin key, offline.
Las capacidades son **aproximadas** y varían por versión: quedan editables.

## Las dos dudas de diseño del proyecto

**¿Cómo saber la capacidad total del tanque?**
No hay forma de deducirla: depende de la versión del modelo y sale del manual o la ficha
técnica. Es un campo **opcional** del vehículo (`capacidadTanque`), que el catálogo local
precarga como sugerencia, y sólo se usa para el medidor estimado.

**¿Cómo saber cuántos litros se cargaron?**
El dato exacto es el del **ticket del surtidor** — ese es el modo por defecto del formulario.
Para cuando no tenés el ticket, el formulario ofrece un segundo modo: un **medidor tipo tablero**
(aguja de E a F, en pasos de ⅛) donde marcás el nivel antes y después de cargar:

```
litros ≈ (nivelDespués − nivelAntes) × capacidadTanque
```

La carga queda marcada como `estimada` y se excluye del cálculo de autonomía confiable, porque
la aguja no es lineal ni precisa. Es un dato para no perder el registro del gasto, no para medir
consumo.

## Deploy en Vercel

El proyecto es una app estática, sin variables de entorno ni configuración extra.

**Desde la web:**

1. Subí el repo a GitHub.
2. En Vercel: *Add New… → Project* → importá el repo.
3. Vercel detecta Vite solo (Build Command `npm run build`, Output Directory `dist`). Deploy.

**Desde la CLI:**

```bash
npm i -g vercel
vercel        # preview
vercel --prod # producción
```

`vercel.json` incluye el rewrite de SPA para que las rutas (`/services`, `/vtv`, …) funcionen
al recargar o al entrar directo por URL.

## Estructura

```
src/
├── components/
│   ├── layout/       AppShell, BottomNav, SelectorVehiculo
│   └── ui/           Card, Button, Input, Modal, EmptyState
├── context/          DatosContext (estado global + CRUD multi-vehículo)
├── data/             catalogo (modelos AR), intervalos (próximo service)
├── features/
│   ├── dashboard/
│   ├── vehiculo/
│   ├── services/
│   ├── combustible/
│   └── vtv/
├── hooks/            useLocalStorage
├── lib/              calculos, format, storage, cn
└── types/            modelos e interfaces
```
