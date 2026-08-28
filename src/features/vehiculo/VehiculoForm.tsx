import { useId, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import { CATALOGO, MARCAS, buscarModelo, modelosDe } from '@/data/catalogo';
import { cn } from '@/lib/cn';
import { CARROCERIAS, type Carroceria, type Vehiculo } from '@/types';

const COLORES = [
  { hex: '#c8ced8', nombre: 'Gris plata' },
  { hex: '#e8ebf0', nombre: 'Blanco' },
  { hex: '#1e2126', nombre: 'Negro' },
  { hex: '#b03a3a', nombre: 'Rojo' },
  { hex: '#2b5f9e', nombre: 'Azul' },
  { hex: '#3f7d52', nombre: 'Verde' },
  { hex: '#8a8f96', nombre: 'Gris oscuro' },
  { hex: '#c98b2e', nombre: 'Dorado' },
];

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (v: Omit<Vehiculo, 'id'> & { id?: string }) => void;
  inicial?: Vehiculo;
}

interface Borrador {
  marca: string;
  modelo: string;
  anio: string;
  patente: string;
  kmActual: string;
  capacidadTanque: string;
  carroceria: Carroceria;
  color: string;
}

function borradorDesde(v: Vehiculo | undefined): Borrador {
  return {
    marca: v?.marca ?? '',
    modelo: v?.modelo ?? '',
    anio: v?.anio ? String(v.anio) : String(new Date().getFullYear()),
    patente: v?.patente ?? '',
    kmActual: String(v?.kmActual ?? 0),
    capacidadTanque: v?.capacidadTanque != null ? String(v.capacidadTanque) : '',
    carroceria: v?.carroceria ?? 'hatchback',
    color: v?.color ?? COLORES[0].hex,
  };
}

export function VehiculoForm({ abierto, onCerrar, onGuardar, inicial }: Props) {
  const idMarcas = useId();
  const idModelos = useId();
  const [b, setB] = useState<Borrador>(() => borradorDesde(inicial));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [autocompletado, setAutocompletado] = useState(false);

  const [claveAbierta, setClaveAbierta] = useState('');
  const claveActual = `${abierto}-${inicial?.id ?? 'nuevo'}`;
  if (abierto && claveAbierta !== claveActual) {
    setClaveAbierta(claveActual);
    setB(borradorDesde(inicial));
    setErrores({});
    setAutocompletado(false);
  }

  /**
   * Al completar marca + modelo, el catálogo local precarga capacidad de tanque
   * y carrocería. Son valores aproximados: quedan editables.
   */
  const aplicarCatalogo = (marca: string, modelo: string) => {
    const encontrado = buscarModelo(marca, modelo);
    if (!encontrado) return;
    setB((p) => ({
      ...p,
      marca: encontrado.marca,
      modelo: encontrado.modelo,
      carroceria: encontrado.carroceria,
      capacidadTanque: p.capacidadTanque || String(encontrado.tanque),
    }));
    setAutocompletado(true);
  };

  const setMarca = (valor: string) => {
    setB((p) => ({ ...p, marca: valor }));
    setAutocompletado(false);
    if (b.modelo) aplicarCatalogo(valor, b.modelo);
  };

  const setModelo = (valor: string) => {
    setB((p) => ({ ...p, modelo: valor }));
    setAutocompletado(false);
    aplicarCatalogo(b.marca, valor);
  };

  const validar = (): boolean => {
    const e: Record<string, string> = {};
    if (!b.marca.trim() && !b.modelo.trim()) e.marca = 'Poné al menos marca o modelo.';
    const anio = Number(b.anio);
    if (!Number.isFinite(anio) || anio < 1900 || anio > new Date().getFullYear() + 1) {
      e.anio = 'Año inválido.';
    }
    const km = Number(b.kmActual);
    if (!Number.isFinite(km) || km < 0) e.kmActual = 'Kilometraje inválido.';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = () => {
    if (!validar()) return;
    const capacidad = Number(b.capacidadTanque);
    onGuardar({
      id: inicial?.id,
      marca: b.marca.trim(),
      modelo: b.modelo.trim(),
      anio: Number(b.anio),
      patente: b.patente.trim().toUpperCase(),
      kmActual: Math.max(0, Number(b.kmActual) || 0),
      capacidadTanque: capacidad > 0 ? capacidad : undefined,
      carroceria: b.carroceria,
      color: b.color,
    });
    onCerrar();
  };

  const modelosSugeridos = b.marca ? modelosDe(b.marca) : CATALOGO;

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={inicial ? 'Editar vehículo' : 'Nuevo vehículo'}
      pie={
        <>
          <Button ancho onClick={onCerrar}>
            Cancelar
          </Button>
          <Button ancho variante="primario" onClick={guardar}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Marca"
            list={idMarcas}
            value={b.marca}
            onChange={(e) => setMarca(e.target.value)}
            placeholder="Volkswagen"
            error={errores.marca}
          />
          <Input
            label="Modelo"
            list={idModelos}
            value={b.modelo}
            onChange={(e) => setModelo(e.target.value)}
            placeholder="Gol Trend"
          />
        </div>

        <datalist id={idMarcas}>
          {MARCAS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <datalist id={idModelos}>
          {modelosSugeridos.map((m) => (
            <option key={`${m.marca}-${m.modelo}`} value={m.modelo} />
          ))}
        </datalist>

        {autocompletado ? (
          <p className="flex items-start gap-1.5 text-xs text-ambar-400">
            <Sparkles size={13} className="mt-0.5 shrink-0" />
            Capacidad y carrocería precargadas del catálogo local. Son aproximadas: verificá con
            el manual.
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Año"
            mono
            type="number"
            inputMode="numeric"
            value={b.anio}
            onChange={(e) => setB((p) => ({ ...p, anio: e.target.value }))}
            error={errores.anio}
          />
          <Input
            label="Patente"
            value={b.patente}
            onChange={(e) => setB((p) => ({ ...p, patente: e.target.value }))}
            placeholder="AB123CD"
            className="uppercase"
            autoCapitalize="characters"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Kilometraje"
            mono
            type="number"
            inputMode="numeric"
            sufijo="km"
            value={b.kmActual}
            onChange={(e) => setB((p) => ({ ...p, kmActual: e.target.value }))}
            error={errores.kmActual}
          />
          <Input
            label="Tanque"
            mono
            type="number"
            inputMode="decimal"
            step="0.5"
            sufijo="L"
            value={b.capacidadTanque}
            onChange={(e) => setB((p) => ({ ...p, capacidadTanque: e.target.value }))}
            placeholder="55"
          />
        </div>

        <Select
          label="Carrocería"
          value={b.carroceria}
          onChange={(e) => setB((p) => ({ ...p, carroceria: e.target.value as Carroceria }))}
          opciones={CARROCERIAS}
        />

        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {COLORES.map((c) => (
              <button
                key={c.hex}
                type="button"
                title={c.nombre}
                aria-label={c.nombre}
                onClick={() => setB((p) => ({ ...p, color: c.hex }))}
                className={cn(
                  'h-9 w-9 rounded-full border-2 transition-transform',
                  b.color === c.hex
                    ? 'border-ambar-500 scale-110'
                    : 'border-carbon-600 hover:border-carbon-400',
                )}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
