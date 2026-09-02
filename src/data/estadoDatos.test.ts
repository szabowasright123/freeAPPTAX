// @vitest-environment jsdom
/**
 * estadoDatos.test.ts — el aviso de que no se pudo leer el Libro.
 *
 * Su contrato es corto y conviene que no se rompa: mientras dure la misma racha de fallos la
 * REFERENCIA no cambia (si cambiara, la cabecera se repintaría en cada consulta que falle, y
 * fallan todas a la vez), y una lectura buena cierra la racha.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { limpiarFalloLectura, registrarFalloLectura, useFalloLectura } from './estadoDatos'

// El estado vive en una variable de módulo: se limpia entre pruebas.
beforeEach(() => {
  act(() => limpiarFalloLectura())
})

describe('estadoDatos', () => {
  it('sin fallos, no hay aviso', () => {
    const { result } = renderHook(() => useFalloLectura())
    expect(result.current).toBeNull()
  })

  it('un fallo de lectura se ve desde el hook, con su mensaje', () => {
    const { result } = renderHook(() => useFalloLectura())
    act(() => registrarFalloLectura(new Error('IndexedDB no disponible')))
    expect(result.current?.mensaje).toBe('IndexedDB no disponible')
  })

  it('lo que no es Error también sirve: se guarda su texto', () => {
    const { result } = renderHook(() => useFalloLectura())
    act(() => registrarFalloLectura('la base está cerrada'))
    expect(result.current?.mensaje).toBe('la base está cerrada')
  })

  it('el mismo fallo repetido no cambia la referencia', () => {
    const { result } = renderHook(() => useFalloLectura())
    act(() => registrarFalloLectura(new Error('mismo fallo')))
    const primero = result.current
    act(() => registrarFalloLectura(new Error('mismo fallo')))
    expect(result.current).toBe(primero)
  })

  it('una lectura buena cierra la racha', () => {
    const { result } = renderHook(() => useFalloLectura())
    act(() => registrarFalloLectura(new Error('se cayó')))
    expect(result.current).not.toBeNull()
    act(() => limpiarFalloLectura())
    expect(result.current).toBeNull()
  })
})
