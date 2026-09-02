import { AppShell } from '../ui/shell/AppShell'
import { ErrorBoundary } from '../ui/shell/ErrorBoundary'
import { ActualizacionPWA } from '../pwa/ActualizacionPWA'

/**
 * App — edición gratuita local, sin cuenta, licencia ni contenidos docentes.
 */
export function App() {
  return (
    <>
      {/* Último recurso: si revienta la propia cabecera, aquí hay una pantalla que explica
          que los datos siguen guardados, en vez de una ventana en blanco. El límite fino
          —el que conserva la navegación— vive dentro de `AppShell`, alrededor de la página. */}
      <ErrorBoundary alcance="app">
        <AppShell />
      </ErrorBoundary>
      <ActualizacionPWA />
    </>
  )
}
