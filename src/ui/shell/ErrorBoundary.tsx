/**
 * ErrorBoundary.tsx — la red bajo la app: una excepción de render no deja pantalla en blanco.
 *
 * Por qué existe. Hasta ahora no había ninguna: cualquier error de render —un dato inesperado
 * en un apunte importado, un `undefined` donde se esperaba una cifra— desmontaba el árbol
 * entero y dejaba la ventana EN BLANCO. Un alumno con un cuatrimestre de trabajo dentro no lee
 * una pantalla en blanco como «un fallo de la aplicación»: la lee como «he perdido el Libro».
 * Y como el Libro vive en su navegador y no hay servidor al que preguntar, esa sospecha no la
 * desmiente nadie. De ahí que el texto de abajo diga, antes que ninguna otra cosa, que sus
 * datos siguen ahí y que no borre nada.
 *
 * Dos alcances, y el de dentro es el que más se va a usar:
 *  · `alcance="pagina"` — envuelve SOLO el contenido de `<main>`. La cabecera y la navegación
 *    sobreviven, así que el alumno se va a otra sección con un clic y sigue trabajando. En
 *    `AppShell` va con `key={ruta}`: al cambiar de ruta el límite se vuelve a montar y se
 *    reinicia solo, sin lógica de reseteo que mantener.
 *  · `alcance="app"` — último recurso en `App.tsx`, por si lo que revienta es la propia
 *    cabecera. Aquí ya no queda navegación, así que la salida es recargar.
 *
 * Las clases van LITERALES y no salen de `comp.tsx` a propósito: si lo que ha fallado es el
 * sistema de diseño, esta pantalla tiene que pintarse igual. Es la única del proyecto que se
 * permite no usar el sistema, y esta línea es su justificación.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { irA } from './rutas'

interface Props {
  children: ReactNode
  alcance: 'pagina' | 'app'
}

interface Estado {
  error: Error | null
}

const BOTON =
  'rounded-control px-3 py-2 text-cuerpo font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'

export class ErrorBoundary extends Component<Props, Estado> {
  override state: Estado = { error: null }

  static getDerivedStateFromError(error: Error): Estado {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Local-first (Regla de oro 3): esto NO se envía a ninguna parte. Se escribe en la consola
    // del propio navegador para que el alumno pueda copiarlo si pide ayuda.
    console.error('[Libro Hespérides] error de render:', error, info.componentStack)
  }

  override render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    const esApp = this.props.alcance === 'app'

    return (
      <div
        role="alert"
        className={
          esApp
            ? 'mx-auto max-w-2xl px-4 py-10 text-texto'
            : 'mx-auto max-w-2xl py-6 text-texto'
        }
      >
        <div className="space-y-4 rounded-panel border border-amber-300 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/40">
          <h1 className="text-titulo font-semibold tracking-tight text-amber-900 dark:text-amber-200">
            {esApp ? 'La aplicación no ha podido dibujarse' : 'Esta pantalla no ha podido dibujarse'}
          </h1>

          <div className="space-y-2 text-lectura text-amber-900 dark:text-amber-100/90">
            <p>
              <strong>Tu Libro sigue donde estaba.</strong> Esto es un fallo al pintar
              {esApp ? ' la aplicación' : ' esta sección'}, no un problema de tus datos: los
              apuntes, las ubicaciones y los justificantes siguen guardados en este navegador,
              intactos.
            </p>
            <p>
              <strong>No borres nada ni empieces de cero.</strong>{' '}
              {esApp
                ? 'Recarga la página; si vuelve a pasar, cierra el navegador y ábrelo otra vez.'
                : 'Vuelve al inicio o entra en otra sección: lo más probable es que todo lo demás funcione con normalidad.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={`${BOTON} bg-brand-600 text-white hover:bg-brand-700`}
            >
              Recargar la página
            </button>
            {!esApp && (
              <>
                <button
                  type="button"
                  onClick={() => irA('inicio')}
                  className={`${BOTON} border border-borde-fuerte bg-superficie-elevada text-texto hover:bg-superficie`}
                >
                  Volver al inicio
                </button>
                <button
                  type="button"
                  onClick={() => irA('ajustes')}
                  className={`${BOTON} border border-borde-fuerte bg-superficie-elevada text-texto hover:bg-superficie`}
                >
                  Descargar copia de seguridad
                </button>
              </>
            )}
          </div>

          {/* El detalle técnico, plegado: no le sirve al alumno, pero es exactamente lo que
              hace falta si nos manda una captura pidiendo ayuda. */}
          <details className="text-apoyo text-amber-900 dark:text-amber-100/80">
            <summary className="cursor-pointer">Detalle técnico</summary>
            <p className="mt-2 whitespace-pre-wrap break-words font-mono text-caption">
              {error.name}: {error.message}
            </p>
          </details>
        </div>
      </div>
    )
  }
}
