import { useState } from 'react';
import { AlertTriangle, Gauge } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';

/** Logo de Google en SVG: pegar un PNG externo rompería el look en dark. */
function LogoGoogle() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

/**
 * Puerta de entrada. Los datos viven en la cuenta de cada uno, así que sin
 * sesión no hay nada que mostrar.
 */
export function LoginPage() {
  const { entrar, error } = useAuth();
  const [entrando, setEntrando] = useState(false);

  const onEntrar = async () => {
    setEntrando(true);
    await entrar();
    setEntrando(false);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-carbon-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-carbon-600 bg-carbon-800 text-ambar-400">
            <Gauge size={26} />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-carbon-100">
            Cuenta<span className="text-ambar-400">KM</span>
          </h1>
          <p className="mt-1 text-sm text-carbon-400">
            Services, nafta, seguro y VTV de tu auto, sincronizados entre todos tus dispositivos.
          </p>
        </div>

        <Card>
          <CardBody className="flex flex-col gap-4">
            <Button variante="primario" tamanio="lg" ancho onClick={onEntrar} disabled={entrando}>
              <LogoGoogle />
              {entrando ? 'Abriendo Google…' : 'Entrar con Google'}
            </Button>

            {error ? (
              <p className="flex items-start gap-2 rounded-lg bg-rojo-500/10 px-3 py-2 text-xs text-rojo-500">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                {error}
              </p>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/** Falta la config de Firebase: sin esto no hay ni login ni datos. */
export function SinConfigurar() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-carbon-900 px-4">
      <Card className="w-full max-w-md">
        <CardBody className="flex flex-col gap-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-ambar-400">
            <AlertTriangle size={16} />
            Falta configurar Firebase
          </span>
          <p className="text-sm text-carbon-300">
            Copiá <code className="text-ambar-400">.env.example</code> a{' '}
            <code className="text-ambar-400">.env.local</code> y completá las variables{' '}
            <code className="text-ambar-400">VITE_FIREBASE_*</code> con las de tu proyecto. En
            Vercel van como variables de entorno del proyecto.
          </p>
          <p className="text-xs text-carbon-500">
            El paso a paso está en el README, sección «Sincronización».
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
