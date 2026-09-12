import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

const BASE_CAMPO =
  'w-full rounded-xl border border-carbon-600 bg-carbon-850 px-3 py-2.5 text-carbon-100 ' +
  'placeholder:text-carbon-500 transition-colors ' +
  'focus:border-ambar-500 focus:outline-none focus:ring-1 focus:ring-ambar-500 ' +
  'disabled:opacity-60';

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold uppercase tracking-wider text-carbon-400"
      >
        {label}
      </label>
      {children}
      {error ? (
        <span className="text-xs text-rojo-500">{error}</span>
      ) : hint ? (
        <span className="text-xs text-carbon-500">{hint}</span>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string;
  /** Números en mono tabular, como el tablero. */
  mono?: boolean;
  prefijo?: string;
  sufijo?: string;
  contenedorClassName?: string;
}

export function Input({
  label,
  hint,
  error,
  mono,
  prefijo,
  sufijo,
  className,
  contenedorClassName,
  id,
  ...props
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <Field
      label={label}
      htmlFor={inputId}
      hint={hint}
      error={error}
      className={contenedorClassName}
    >
      <div className="relative flex items-center">
        {prefijo ? (
          <span className="num pointer-events-none absolute left-3 text-sm text-carbon-400">
            {prefijo}
          </span>
        ) : null}
        <input
          id={inputId}
          className={cn(
            BASE_CAMPO,
            mono && 'num',
            error && 'border-rojo-500 focus:border-rojo-500 focus:ring-rojo-500',
            prefijo && 'pl-8',
            sufijo && 'pr-12',
            className,
          )}
          {...props}
        />
        {sufijo ? (
          <span className="pointer-events-none absolute right-3 text-sm text-carbon-400">
            {sufijo}
          </span>
        ) : null}
      </div>
    </Field>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: ReactNode;
  error?: string;
  opciones: readonly { value: string; label: string }[];
}

export function Select({ label, hint, error, opciones, className, id, ...props }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <Field label={label} htmlFor={selectId} hint={hint} error={error}>
      <select
        id={selectId}
        className={cn(BASE_CAMPO, 'appearance-none pr-8', error && 'border-rojo-500', className)}
        {...props}
      >
        {opciones.map((o) => (
          <option key={o.value} value={o.value} className="bg-carbon-800">
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

interface SelectMultipleProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  opciones: readonly { value: string; label: string }[];
  valor: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}

/** Desplegable con checkboxes: mismo look del Select simple, pero de varios. */
export function SelectMultiple({
  label,
  hint,
  error,
  opciones,
  valor,
  onChange,
  placeholder = 'Elegí uno o más',
}: SelectMultipleProps) {
  const id = useId();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [abierto]);

  const alternar = (v: string) =>
    onChange(valor.includes(v) ? valor.filter((x) => x !== v) : [...valor, v]);

  const texto = valor.length
    ? opciones
        .filter((o) => valor.includes(o.value))
        .map((o) => o.label)
        .join(', ')
    : placeholder;

  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <div ref={ref} className="relative">
        <button
          type="button"
          id={id}
          onClick={() => setAbierto((a) => !a)}
          aria-expanded={abierto}
          className={cn(
            BASE_CAMPO,
            'flex items-center justify-between gap-2 text-left',
            error && 'border-rojo-500',
            valor.length === 0 && 'text-carbon-500',
          )}
        >
          <span className="truncate">{texto}</span>
          <ChevronDown
            size={16}
            className={cn(
              'shrink-0 text-carbon-400 transition-transform',
              abierto && 'rotate-180',
            )}
          />
        </button>

        {abierto ? (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-carbon-600 bg-carbon-800 p-1 shadow-xl">
            {opciones.map((o) => {
              const activo = valor.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => alternar(o.value)}
                  aria-pressed={activo}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                    activo ? 'text-ambar-300' : 'text-carbon-200 hover:bg-carbon-700',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                      activo ? 'border-ambar-500 bg-ambar-500' : 'border-carbon-500',
                    )}
                  >
                    {activo ? <Check size={11} className="text-carbon-950" strokeWidth={3} /> : null}
                  </span>
                  {o.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </Field>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: ReactNode;
  error?: string;
}

export function Textarea({ label, hint, error, className, id, ...props }: TextareaProps) {
  const autoId = useId();
  const areaId = id ?? autoId;
  return (
    <Field label={label} htmlFor={areaId} hint={hint} error={error}>
      <textarea
        id={areaId}
        rows={3}
        className={cn(BASE_CAMPO, 'resize-y', error && 'border-rojo-500', className)}
        {...props}
      />
    </Field>
  );
}

interface ToggleProps {
  label: string;
  descripcion?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ label, descripcion, checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-carbon-600 bg-carbon-850 px-3 py-3 text-left transition-colors hover:border-carbon-500"
    >
      <span className="flex flex-col">
        <span className="text-sm font-medium text-carbon-100">{label}</span>
        {descripcion ? (
          <span className="text-xs text-carbon-400">{descripcion}</span>
        ) : null}
      </span>
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-ambar-500' : 'bg-carbon-600',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-carbon-950 transition-transform',
            checked ? 'translate-x-5.5' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  );
}
