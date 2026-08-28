# Prompt para Claude Code

Copiá todo el bloque de abajo y pegáselo a Claude Code en VS Code (podés ajustar detalles antes de enviarlo).

---

## PROMPT

Quiero crear una aplicación web para llevar el control completo del mantenimiento y gastos de mi vehículo. Es un proyecto solo de frontend, sin backend ni sistema de usuarios, pensado para deployar en Vercel.

### Stack técnico
- Vite + React + TypeScript
- Tailwind CSS
- react-router-dom (rutas simples, sin backend)
- lucide-react para íconos
- recharts para algún gráfico simple (evolución de autonomía/precio de nafta en el tiempo)
- Persistencia: **localStorage**, con toda la data en un único objeto JSON versionado (ver estructura abajo), usando un custom hook `useLocalStorage` con debounce al guardar
- Sin dependencias de backend, sin auth, sin base de datos externa

### Estructura de datos (localStorage, key: "vehiculo-data-v1")

```ts
interface VehiculoData {
  version: number;
  vehiculo: {
    marca: string;
    modelo: string;
    anio: number;
    patente: string;
    kmActual: number;
  };
  services: Service[];
  cargasCombustible: CargaCombustible[];
  vtv: RegistroVTV[];
}

interface Service {
  id: string;
  fecha: string; // ISO date
  km: number;
  tipo: string; // ej: "Cambio de aceite y filtro", "Frenos", "Correa de distribución", etc.
  descripcion: string;
  costo: number;
  taller?: string;
  proximoKm?: number; // km estimado para el próximo service de este tipo
  proximaFecha?: string; // fecha estimada
}

interface CargaCombustible {
  id: string;
  fecha: string;
  km: number;
  litros: number;
  precioPorLitro: number;
  total: number;
  estacion?: string;
  tanqueLleno: boolean; // para saber si el cálculo de autonomía es confiable
}

interface RegistroVTV {
  id: string;
  fechaRealizada: string;
  fechaVencimiento: string;
  resultado: "aprobada" | "rechazada" | "pendiente";
  costo?: number;
  observaciones?: string;
}
```

### Funcionalidades

**1. Dashboard / Resumen (home)**
- Km actual del vehículo (editable rápido)
- Estado de la VTV: vigente / vence en X días / vencida (con color: verde / amarillo / rojo)
- Último service realizado y kilometraje al que corresponde
- Autonomía promedio (km/litro) calculada sobre las últimas cargas con tanque lleno
- Gasto total en combustible del mes actual y del año
- Gasto total en services del año

**2. Sección Vehículo**
- Form para cargar/editar marca, modelo, año, patente y km actual

**3. Sección Services**
- Listado ordenado por fecha (más reciente primero), con km y costo
- Alta/edición/baja de un service
- Filtro por tipo de service
- Al cargar un service, opción de indicar "próximo km" o "próxima fecha" recomendada, para mostrar alertas en el dashboard cuando se acerque

**4. Sección Combustible**
- Listado de cargas ordenado por fecha
- Alta/edición/baja de carga (fecha, km, litros, precio por litro → calcula total automático, estación, si fue tanque lleno)
- **Cálculo de autonomía**: por cada carga (excepto la primera), calcular km recorridos desde la carga anterior (km actual - km carga anterior) y dividir por litros cargados → mostrar km/litro. Marcar visualmente si el dato no es confiable (porque `tanqueLleno` fue false en alguna de las dos cargas involucradas)
- Gráfico de evolución de precio por litro en el tiempo
- Gráfico de evolución de autonomía (km/L) en el tiempo

**5. Sección VTV**
- Listado histórico de VTVs realizadas
- Alta/edición/baja
- Cálculo automático de estado según fecha de vencimiento vs. hoy

**6. Exportar / Importar datos**
- Botón para exportar todo el JSON de localStorage como archivo descargable (backup)
- Botón para importar un JSON y restaurar los datos
- Esto es importante porque localStorage se puede perder si el usuario borra datos del navegador

### Diseño
- Mobile-first, ya que se va a usar mayormente desde el celular en la estación de servicio o el taller
- Estética tipo "panel de instrumentos / tablero de auto": paleta oscura (grises carbón, no negro puro), un acento tipo ámbar/instrumental para alertas y números destacados, tipografía monoespaciada para los números (km, litros, precios) y una tipografía sans limpia para el resto
- Navegación simple con tabs/bottom nav (Dashboard, Vehículo, Services, Combustible, VTV) — pensada para uso con el pulgar en mobile
- Estados vacíos con mensaje claro invitando a cargar el primer registro

### Estructura del proyecto
- Organizar por features: `src/features/services`, `src/features/combustible`, `src/features/vtv`, `src/features/vehiculo`
- `src/hooks/useLocalStorage.ts`
- `src/lib/calculos.ts` (autonomía, estado VTV, próximos vencimientos)
- `src/types/index.ts`
- Componentes reutilizables en `src/components/ui` (Card, Button, Input, Modal, EmptyState)

### Dudas de diseño
- Como saber cual es la capacidad total de litros del vehiculo?
- Como saber cuantos litros se llenó en una carga? Se puede hacer una especie de "medidor" como el del tablero del auto y cargar de manera aproximada?

### Deploy
- Debe funcionar como app estática (Vite build) lista para deployar en Vercel sin configuración extra
- Incluir `README.md` con instrucciones de instalación (`npm install`, `npm run dev`, `npm run build`) y de deploy en Vercel

Arrancá creando la estructura del proyecto, los tipos, el hook de localStorage y los cálculos base. Después construimos cada sección.

---
