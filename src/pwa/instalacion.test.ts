// @vitest-environment jsdom
/**
 * instalacion.test.ts — el ofrecimiento de instalar la app.
 *
 * Lo que se defiende aquí es la trampa que hace que estos botones no funcionen casi nunca:
 * `beforeinstallprompt` se dispara UNA vez y muy pronto, así que el oyente tiene que estar
 * puesto antes de que React monte, y el evento guardado para cuando alguien pregunte. Si
 * alguien mueve ese oyente dentro de un componente, estas pruebas se caen, que es el objetivo.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { escucharInstalacion, instalar, useEstadoInstalacion } from './instalacion'

/** Un `beforeinstallprompt` como el de Chromium, que jsdom no trae. */
function eventoFalso() {
  const e = new Event('beforeinstallprompt') as Event & {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  }
  e.prompt = vi.fn(async () => {})
  e.userChoice = Promise.resolve({ outcome: 'accepted' as const })
  return e
}

beforeAll(() => {
  escucharInstalacion()
})

describe('instalacion', () => {
  it('sin evento del navegador no se ofrece nada', () => {
    const { result } = renderHook(() => useEstadoInstalacion())
    expect(result.current).toBe('no-disponible')
  })

  it('guarda el evento aunque llegue antes de que nadie pregunte', () => {
    // Se dispara ANTES de montar el hook, como pasa de verdad al arrancar la app.
    act(() => {
      window.dispatchEvent(eventoFalso())
    })
    const { result } = renderHook(() => useEstadoInstalacion())
    expect(result.current).toBe('instalable')
  })

  it('instalar lanza el diálogo del navegador y consume el evento', async () => {
    const e = eventoFalso()
    act(() => {
      window.dispatchEvent(e)
    })
    const { result } = renderHook(() => useEstadoInstalacion())
    expect(result.current).toBe('instalable')

    let aceptado = false
    await act(async () => {
      aceptado = await instalar()
    })

    expect(e.prompt).toHaveBeenCalledOnce()
    expect(aceptado).toBe(true)
    // Consumido: el navegador no lo reemite en esta carga, así que no se insiste.
    expect(result.current).toBe('no-disponible')
  })

  it('sin evento guardado, instalar no hace nada y lo dice', async () => {
    await expect(instalar()).resolves.toBe(false)
  })

  it('si ya se abre como aplicación, no se ofrece instalar', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true, media: '(display-mode: standalone)' })),
    )
    const { result } = renderHook(() => useEstadoInstalacion())
    expect(result.current).toBe('instalada')
    vi.unstubAllGlobals()
  })
})
