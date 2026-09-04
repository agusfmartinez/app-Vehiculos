/**
 * Spinner de pantalla completa. Se usa en dos esperas distintas —a que
 * Firebase resuelva la sesión, y a que Firestore traiga los datos reales—
 * con el mismo look para que no se note el salto entre una y otra.
 */
export function Cargando() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-carbon-900">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-carbon-600 border-t-ambar-400" />
    </div>
  );
}
