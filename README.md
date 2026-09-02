# CuentaKM

App web para llevar el mantenimiento, las cargas de combustible, el seguro y la VTV de **uno o
varios vehículos**. Solo frontend, **sin servidor propio**: se entra con una cuenta de Google y
los datos se guardan en Cloud Firestore, sincronizados entre todos los dispositivos de cada
usuario. También se pueden exportar/importar como archivo JSON.

## Stack

- Vite + React + TypeScript
- Firebase (Authentication con Google + Cloud Firestore)
- Tailwind CSS v4
- react-router-dom
- lucide-react (íconos)
- recharts (gráficos)

## Instalación

```bash
npm install
cp .env.example .env.local   # completar con las credenciales de Firebase
npm run dev                  # http://localhost:5173
```

Sin las variables `VITE_FIREBASE_*` la app arranca pero muestra una pantalla de «Falta
configurar Firebase» en vez del login. El paso a paso está en [Sincronización](#sincronización).

Otros scripts:

```bash
npm run build     # typecheck + build de producción en dist/
npm run preview   # sirve el build local
npm run lint      # solo typecheck (tsc --noEmit)
```

## Cómo se guardan los datos

Los datos viven en **Cloud Firestore**, colgados de la cuenta de Google con la que entrás. No
hay servidor propio: el navegador habla directo con Firestore y las reglas de seguridad hacen
de portero.

```
usuarios/{uid}                    → { vehiculoActivoId, version }
usuarios/{uid}/vehiculos/{id}
usuarios/{uid}/services/{id}
usuarios/{uid}/cargas/{id}
usuarios/{uid}/lecturas/{id}
usuarios/{uid}/polizas/{id}
usuarios/{uid}/vtv/{id}
```

**Un documento por registro**, no un JSON gigante en un solo doc. Es lo que hace que dos
dispositivos que editan cosas distintas no se pisen, que un borrado se propague de verdad (el
documento deja de existir, y «no está» no se confunde con «todavía no llegó») y que cada cambio
suba unos pocos bytes en vez de todo el historial.

En memoria la app sigue viendo la misma forma de siempre, armada por
[`escucharDatos`](src/lib/nube.ts) a partir de los seis listeners:

```ts
{
  version: 4,
  vehiculos: Vehiculo[],        // cada uno con su id
  vehiculoActivoId: string | null,
  services: Service[],          // cada registro con vehiculoId
  cargasCombustible: CargaCombustible[],
  lecturasTanque: LecturaTanque[],
  polizas: Poliza[],
  vtv: RegistroVTV[]
}
```

Firestore está configurado con **caché persistente** (`persistentLocalCache`), así que la app
anda sin señal: lee de IndexedDB y encola las escrituras hasta que vuelve la conexión. Los
cambios se ven en pantalla al instante, antes de que el servidor confirme.

`localStorage` quedó para una sola cosa: si tenías datos cargados de la época sin cuentas, la
primera vez que entrás se suben a tu cuenta (sólo si la cuenta está vacía) y después se ignora.

### Migraciones

`migrar()` en [`src/lib/storage.ts`](src/lib/storage.ts) es el único punto de migración y corre
en cada lectura (del storage o de un backup importado). De v1 a v2:

- el `vehiculo` suelto pasa a ser el primer elemento de `vehiculos`, con un id nuevo;
- todos los services, cargas y VTV existentes quedan asociados a ese id;
- si el v1 estaba vacío, arranca sin vehículos en vez de crear uno fantasma;
- registros con un `vehiculoId` que ya no existe se adoptan por el primer vehículo.

De v2 a v3 aparece `lecturasTanque` y de v3 a v4 `polizas`; ambos arrancan vacíos y nada más
cambia.

Es idempotente: volver a migrar no cambia nada.

Los backups siguen andando: **Vehículos → Copia de seguridad**. Exportar baja un JSON con todos
los vehículos; importar **reemplaza** todo lo que haya en la cuenta.

## Sincronización

Cada usuario entra con Google y ve únicamente sus propios vehículos. No hay cuentas compartidas
ni vehículos de varios dueños: los datos cuelgan del `uid`, que es lo que hace que las reglas de
seguridad sean cortas y difíciles de equivocar.

### Armar el proyecto de Firebase

1. En [console.firebase.google.com](https://console.firebase.google.com) crear un proyecto.
2. **Build → Authentication → Sign-in method → Google**: habilitar.
3. **Authentication → Settings → Authorized domains**: agregar `localhost` y el dominio de
   Vercel (`tu-app.vercel.app` y el propio si tenés uno). Sin esto el login tira
   `auth/unauthorized-domain`.
4. **Build → Firestore Database → Crear base de datos**, en modo producción.
5. **Firestore → Reglas**: pegar el contenido de [`firestore.rules`](firestore.rules) y publicar.
6. **Configuración del proyecto → Tus apps → Web**: registrar una app y copiar los valores del
   SDK a `.env.local` (ver [`.env.example`](.env.example)).

Las claves `VITE_FIREBASE_*` son públicas por diseño: identifican al proyecto, no dan permisos.
Lo único que protege los datos son las reglas.

### Las reglas

```
match /usuarios/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
  match /{coleccion}/{documento} { ... mismo dueño ... }
}
```

Sin sesión no se lee ni se escribe nada, y con sesión sólo la rama propia.

### Sin conexión

La caché persistente de Firestore hace que la app funcione sin señal: los cambios se aplican en
pantalla al instante y quedan encolados hasta que vuelve la conexión. La card **Tu cuenta**
(en Vehículos) muestra el estado: sincronizado, sin conexión o error.

## Secciones

| Sección | Qué hace |
| --- | --- |
| **Tablero** | Ficha del vehículo con odómetro de sólo lectura, VTV con semáforo, alertas de mantenimiento, distancia recorrida, tanque, autonomía y gastos del mes/año. |
| **Vehículos** | Alta/edición/baja de varios vehículos, selección del activo + exportar/importar/borrar datos. Se entra desde la card del tablero, no desde la barra inferior. |
| **Seguro** | Una póliza por mes: aseguradora, monto y datos opcionales. Vista *Pólizas* con la variación contra el mes anterior y vista *Reportes* con la evolución de la cuota y el aumento mes a mes. Se filtra por año, porque hay una sola póliza por mes. |
| **Services** | Alta/edición/baja, filtro por tipo, próximo km y fecha **calculados automáticamente**. |
| **Combustible** | Sub-tabs Registros / Análisis, filtro por mes, cargas por monto pagado y tipo de nafta, mediciones del tanque sin cargar, nivel actual estimado y gráficos. |
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

### La aguja antes de cargar es obligatoria

Toda carga pide **en qué nivel estaba la aguja antes de cargar**, incluso cargando por ticket. El
nivel final no se pregunta: se calcula.

```
nivelDespues = tanqueLleno ? 1 : min(1, nivelAntes + litros / capacidad)
```

Sin ese dato, una carga parcial deja el tanque en un nivel desconocido: no sirve de referencia
para el nivel actual ni de extremo para medir consumo, y obligaba a cargar dos registros (una
medición y después la carga) para lo que es un solo evento.

Esto da lo mejor de los dos modos: los **litros exactos del ticket** con un **nivel final
conocido**. La única lectura de aguja es la previa, y su error queda acotado a media muesca.

Marcar **"Tanque lleno"** sigue siendo el mejor caso: el nivel final es 1 porque cortó el
surtidor, sin depender de la aguja, y dos cargas llenas seguidas dan un consumo exacto.

## Nivel del tanque y mediciones

Se puede registrar el **nivel de la aguja sin cargar nafta**: fecha, kilometraje y posición del
medidor. Con eso la app estima cuánta nafta queda ahora, haciendo un balance desde el último
nivel conocido:

```
litros = nivelReferencia × capacidad
       + litros cargados después de esa referencia
       − (kmActual − kmReferencia) / (km por litro)
```

La *referencia* es el evento más reciente con nivel conocido: una medición, o cualquier carga —
desde que la aguja previa es obligatoria, toda carga sabe en qué nivel quedó el tanque. El
resultado se recorta siempre a `[0, capacidad]`. Las cargas viejas, guardadas antes de esa regla
y sin marcar como tanque lleno, siguen sin servir de referencia: sus litros se suman al balance,
pero no fijan un nivel.

Necesita dos cosas: la capacidad del tanque (ficha del vehículo) y una autonomía medida. Cuando
falta alguna, la app dice cuál en vez de mostrar un número inventado.

Dos mediciones consecutivas alcanzan para medir consumo sin llenar nunca el tanque: es el mismo
cálculo de la sección siguiente.

## Cómo se calcula el consumo

La referencia es **de carga a carga**. Una carga fija un nivel conocido, y el ciclo entre dos
cargas es el tramo más largo y con menos lecturas de aguja involucradas: el menos ruidoso.

Las **mediciones del tanque son puntos dentro de ese ciclo**. Sirven para saber cuánto queda y
cómo viene el tanque en curso, pero **no parten el tramo de referencia**. Esto es deliberado:

> Registrar un dato de más nunca debe empeorar el cálculo.

Sin esa regla, medir el tanque en 13% y cargar nafta cinco kilómetros después partía un ciclo de
205 km en uno bueno y uno inservible — y había que borrar la medición para recuperar el número.

Sólo cuando todavía no hay dos cargas comparables se cae a las mediciones, para no dejar la
pantalla sin ningún número. La app dice sobre qué base calculó.

### La fórmula

Entre los dos extremos de un tramo:

```
litros = nivelDesde × capacidad
       + litros cargados en el medio (incluidos los del evento final)
       − nivelHasta × capacidad

km/L   = (kmHasta − kmDesde) / litros
```

No reemplaza al full-to-full clásico, lo **generaliza**: si los dos extremos son tanque lleno,
`nivelDesde = nivelHasta = 1` y los términos de capacidad se cancelan, quedando
`litros = los litros cargados`. Por eso un ciclo entre dos tanques llenos sigue siendo exacto y
ni siquiera necesita que la capacidad esté cargada.

Una carga parcial en el medio **no corta el ciclo**: sus litros entran al balance. Antes se
perdían dos tramos por cada carga parcial intermedia.

### Qué nivel conoce cada evento

| Evento | ¿Nivel conocido? |
| --- | --- |
| Carga a tanque lleno | Sí, nivel = 1 |
| Carga estimada con el medidor | Sí, el nivel después de cargar |
| Medición del medidor | Sí, el nivel de la aguja |
| **Carga parcial por ticket** | **No** — sabe cuántos litros entraron, no dónde quedó la aguja |

### Precisión

- **exacto** — los dos extremos son tanques llenos por ticket. No depende de la aguja ni de la
  capacidad declarada.
- **estimado** — algún extremo salió del medidor. Los litros salidos del medidor hacen estimado
  al tramo **aunque la aguja termine en F**: lo que se aproxima son los litros, no sólo el nivel.

### Cómo se promedia

Total de kilómetros sobre total de litros, **no** el promedio de los km/L de cada ciclo:

```
km/L = Σ kmRecorridos / Σ litrosConsumidos
```

Promediar razones le da el mismo peso a un ciclo de 30 km que a uno de 600.

### Tanque en curso

Aparte del promedio, se muestra el parcial del ciclo abierto: de la última carga a la última
medición posterior. Es un ciclo sin cerrar, así que **no entra al promedio**.

### Resolución del medidor

La aguja se lee de a muescas: con el control en pasos de ⅛, un tanque de 55 L da **6,875 L por
muesca**. Ese es el mínimo que el instrumento puede distinguir.

Un tramo estimado cuyo consumo quede por debajo de una muesca no es una medición, es ruido. No se
corta ahí: el tramo se extiende hasta la siguiente ancla, y si era el último del historial, sus
kilómetros se absorben en el tramo anterior.

Por eso los litros estimados con el medidor se guardan con 3 decimales. Con 2 quedaba un residuo:
`(0,5 − 0,125) × 55 = 20,625 L` se guardaba como `20,63`, y esos 0,005 L de más se leían después
como consumo real — un tramo de 5 km daba 1.000 km/L.

### Datos imposibles

Un vehículo naftero rinde entre 5 y 20 km/L; una moto llega a 40. Un tramo fuera de la banda
**1–60 km/L** no es un rendimiento raro: es un dato mal cargado — un kilometraje tipeado con un
dígito de más, o una aguja marcada al revés.

Caso aparte: si el consumo da **negativo más allá del ruido**, la aguja subió sin que haya una
carga registrada en el medio. Los datos se contradicen, y el aviso lo dice con esas palabras en
vez de hablar de km/L.

Los dos casos se marcan en rojo en el listado, con los km y los litros que produjeron el número
para ubicar el registro culpable, y quedan **fuera del promedio**.

## Navegación

La barra inferior tiene las cinco secciones de uso diario: **Tablero · Services · Nafta · Seguro ·
VTV**, con Nafta al medio porque es la que más se abre y en el centro cae bajo el pulgar.

**Vehículos** salió de la barra: se toca una vez cada tanto, así que se entra desde una card del
tablero en vez de ocupar un lugar fijo.

## Filtro por mes

Combustible filtra por mes con chips desplazables, más una opción **Todas**. El historial muestra
20 registros y un botón *Ver más*.

El filtro recorta **lo que se muestra, no lo que se calcula**: el consumo de un mes necesita la
carga del mes anterior para tener contra qué comparar. Los ciclos se arman siempre sobre el
historial completo y recién después se filtran por el mes en que terminan.

## Odómetro

El km del tablero sale del **registro más alto cargado** — service, carga o medición — y no del
valor guardado a mano: si estuviste en el taller con 138.913 km, el auto tiene al menos esos.
Por eso el tablero lo muestra de sólo lectura: se corrige cargando una medición o editando el km
en la ficha del vehículo, nunca desde el tablero. También se muestra la distancia cubierta por el
historial (del registro más viejo al más nuevo).

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

El proyecto es una app estática. Lo único que necesita son las variables `VITE_FIREBASE_*`
cargadas en *Settings → Environment Variables* (las mismas de `.env.local`). Ojo: Vite las
compila al hacer el build, así que después de cambiarlas hay que **redeployar**.

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
├── context/          AuthContext (sesión), DatosContext (estado global + CRUD)
├── data/             catalogo (modelos AR), intervalos (próximo service)
├── features/
│   ├── auth/         LoginPage
│   ├── dashboard/
│   ├── vehiculo/
│   ├── services/
│   ├── combustible/
│   ├── seguro/
│   └── vtv/
├── hooks/            useEnLinea
├── lib/              calculos, format, storage, periodos, cn,
│                     firebase (auth), db (firestore), nube (colecciones)
└── types/            modelos e interfaces
```
