import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { useId } from 'react';
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
