// @vitest-environment jsdom
/**
 * ErrorBoundary.test.tsx — la red bajo la app.
 *
 * Lo que se prueba no es el aspecto de la pantalla de recuperación, sino las dos promesas que
 * hace y que son la razón de que exista: que una excepción de render NO deja la ventana en
 * blanco, y que el texto que aparece le dice al alumno lo único que importa —que su Libro
 * sigue guardado— en lugar de dejarle suponer lo contrario.
 *
 * No toca IndexedDB: el límite es puramente de render.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ErrorBoundary } from './ErrorBoundary'

/** Un hijo que revienta al pintarse, como haría un dato inesperado en una pantalla real. */
function Explota(): never {
  throw new Error('cifra inesperada en el apunte 2025-014')
}

beforeEach(() => {
  // React y el propio límite escriben el error en consola: es deliberado (queda en el
  // navegador del alumno para poder pedir ayuda), pero aquí solo ensucia la salida.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
})

describe('ErrorBoundary', () => {
  it('con el hijo sano no se interpone: pinta lo que le den', () => {
    render(
      <ErrorBoundary alcance="pagina">
        <p>El Diario, con sus apuntes</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('El Diario, con sus apuntes')).toBeInTheDocument()
  })

  it('atrapa la excepción y, antes que nada, dice que los datos siguen ahí', () => {
    render(
      <ErrorBoundary alcance="pagina">
        <Explota />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Tu Libro sigue donde estaba/i)).toBeInTheDocument()
    expect(screen.getByText(/No borres nada ni empieces de cero/i)).toBeInTheDocument()
  })

  it('en una página ofrece salidas que conservan el trabajo: inicio y copia de seguridad', () => {
    render(
      <ErrorBoundary alcance="pagina">
        <Explota />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('button', { name: 'Recargar la página' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volver al inicio' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Descargar copia de seguridad' }),
    ).toBeInTheDocument()
  })

  it('en el límite de la app solo cabe recargar: ya no hay navegación que ofrecer', () => {
    render(
      <ErrorBoundary alcance="app">
        <Explota />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('button', { name: 'Recargar la página' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Volver al inicio' })).not.toBeInTheDocument()
  })

  it('guarda el detalle técnico para cuando el alumno pida ayuda', () => {
    render(
      <ErrorBoundary alcance="pagina">
        <Explota />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/cifra inesperada en el apunte 2025-014/)).toBeInTheDocument()
  })
})
