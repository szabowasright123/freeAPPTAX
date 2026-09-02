/**
 * SeccionCuadre — el semáforo del CUADRE (Tabla 5 del manual), por fin con pantalla (P11).
 *
 * Por cada celda (ubicación × activo) con movimiento, el alumno teclea el SALDO REAL leído en
 * la fuente (exchange, wallet, canal) y ve la diferencia contra el saldo calculado por el
 * motor, clasificada con el semáforo: |dif| ≤ verde → OK · ≤ ámbar → REVISAR · mayor → ERROR.
 *
 * Reparto de responsabilidades (Regla de oro 4): el CÁLCULO es del motor —`calcularSaldos` +
 * `calcularCuadre` (engine/cuadre.ts), intocables—; aquí solo presentación, entrada es-ES
 * (coma o punto) y persistencia vía repositorio (`cuadreReal` en parámetros, que ya viajaba
 * en la copia JSON desde P4). Los saldos declarados sobreviven a recargas y copias.
 */
import { useMemo, useState, type ReactNode } from 'react'
import type { Apunte, EstadoSemaforo, RefUbicacion, SimboloActivo } from '../../engine/types'
import { TOLERANCIAS_POR_DEFECTO } from '../../engine/types'
import { calcularSaldos } from '../../engine/saldos'
import { calcularCuadre } from '../../engine/cuadre'
import { D, aCadena } from '../../engine/decimal'
import {
  obtenerCuadreReal,
  obtenerTolerancias,
  guardarSaldoRealDeclarado,
} from '../../data/repositorio'
import { useLiveQuery } from '../../data/useLiveQuery'
import { INPUT_SISTEMA, Card, Tabla, Chip } from '../comp'
import { aDecimalDominio, fmtDecimal } from '../formato'

/** El semáforo del cuadre como Chip del sistema (D3): sus colores de siempre, más visible que
 *  el punto de 12 px de antes. El tono lleva el color; el texto, el estado. */
const TONO_SEMAFORO: Record<EstadoSemaforo, 'ok' | 'revisar' | 'error'> = {
  OK: 'ok',
  REVISAR: 'revisar',
  ERROR: 'error',
}

/** Una fila de la tabla del cuadre (celda calculada + declaración si la hay). */
interface FilaVista {
  ubicacion: RefUbicacion
  activo: SimboloActivo
  saldoCalculado: string
  /** Saldo real declarado (cadena interna con punto); null = sin declarar. */
  saldoReal: string | null
  diferencia: string | null
  estado: EstadoSemaforo | null
}

export function SeccionCuadre({
  apuntes,
  nombreUbic,
  titulo = 'Cuadre (semáforo)',
  introduccion,
}: {
  apuntes: Apunte[]
  nombreUbic: (r: RefUbicacion) => string
  /** Título del bloque. Por defecto «Cuadre (semáforo)» (Trazabilidad no cambia); el Panel
   *  pasa «3 · Cuadre» para que el bloque quede numerado como los otros tres. */
  titulo?: ReactNode
  /** Introducción bajo el título. Por defecto, la del saldo real y las tolerancias. */
  introduccion?: ReactNode
}) {
  const cuadreQ = useLiveQuery(obtenerCuadreReal, [])
  const tolQ = useLiveQuery(obtenerTolerancias, [])
  const declarados = cuadreQ.estado === 'listo' ? cuadreQ.datos : []
  const tol = tolQ.estado === 'listo' ? tolQ.datos : TOLERANCIAS_POR_DEFECTO

  const filas = useMemo<FilaVista[]>(() => {
    const saldos = calcularSaldos(apuntes)
    // El semáforo lo pone el motor (solo para las celdas declaradas).
    const cuadre = calcularCuadre(saldos, declarados, tol)
    const cuadrePorClave = new Map(cuadre.map((f) => [`${f.ubicacion}\u0000${f.activo}`, f]))

    // Celdas con movimiento + declaraciones huérfanas (declaradas sin saldo calculado).
    const vistas = new Map<string, FilaVista>()
    for (const s of saldos) {
      const k = `${s.ubicacion}\u0000${s.activo}`
      const f = cuadrePorClave.get(k)
      vistas.set(k, {
        ubicacion: s.ubicacion,
        activo: s.activo,
        saldoCalculado: s.saldo,
        saldoReal: f?.saldoReal ?? null,
        diferencia: f?.diferencia ?? null,
        estado: f?.estado ?? null,
      })
    }
    for (const f of cuadre) {
      const k = `${f.ubicacion}\u0000${f.activo}`
      if (!vistas.has(k)) {
        vistas.set(k, {
          ubicacion: f.ubicacion,
          activo: f.activo,
          saldoCalculado: f.saldoCalculado,
          saldoReal: f.saldoReal,
          diferencia: f.diferencia,
          estado: f.estado,
        })
      }
    }
    return [...vistas.values()].sort(
      (a, b) =>
        nombreUbic(a.ubicacion).localeCompare(nombreUbic(b.ubicacion)) ||
        a.activo.localeCompare(b.activo),
    )
  }, [apuntes, declarados, tol, nombreUbic])

  const resumen = useMemo(() => {
    const r = { ok: 0, revisar: 0, error: 0, sinDeclarar: 0 }
    for (const f of filas) {
      if (f.estado === 'OK') r.ok++
      else if (f.estado === 'REVISAR') r.revisar++
      else if (f.estado === 'ERROR') r.error++
      else r.sinDeclarar++
    }
    return r
  }, [filas])

  if (filas.length === 0) return null

  return (
    <Card aria-labelledby="cuadre-titulo">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 id="cuadre-titulo" className="text-titulo font-semibold tracking-tight text-texto">
              {titulo}
            </h2>
            <p className="text-apoyo text-texto-secundario">
              {introduccion ?? (
                <>
                  Teclea el <strong>saldo real</strong> leído en cada fuente (exchange, wallet,
                  canal) y compáralo con el calculado. Tolerancias: verde ≤{' '}
                  {fmtDecimal(aCadena(D(tol.verde)))} · ámbar ≤ {fmtDecimal(aCadena(D(tol.ambar)))}.
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip tono="ok">{resumen.ok} OK</Chip>
            <Chip tono="revisar">{resumen.revisar} REVISAR</Chip>
            <Chip tono="error">{resumen.error} ERROR</Chip>
            <Chip>{resumen.sinDeclarar} sin declarar</Chip>
          </div>
        </div>

        <Tabla>
          <caption className="sr-only">
            Cuadre por ubicación y activo: saldo calculado, saldo real declarado, diferencia y
            semáforo.
          </caption>
          <thead>
            <tr>
              <th scope="col">Ubicación</th>
              <th scope="col">Activo</th>
              <th scope="col" data-num>Saldo calculado</th>
              <th scope="col" data-num>Saldo real (tú)</th>
              <th scope="col" data-num>Diferencia</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <FilaCuadreVista
                key={`${f.ubicacion} ${f.activo}`}
                fila={f}
                nombreUbic={nombreUbic}
              />
            ))}
          </tbody>
        </Tabla>
        <p className="text-apoyo text-texto-mudo">
          El saldo real lo tecleas tú desde la fuente; se guarda en tu navegador y viaja en la
          copia de seguridad JSON. Deja la casilla vacía para quitar la declaración. Un ERROR
          suele significar un apunte olvidado o una cantidad mal tecleada: revisa el Diario.
        </p>
      </div>
    </Card>
  )
}

/** Fila del cuadre con su entrada de saldo real (commit al salir del campo o con Enter). */
function FilaCuadreVista({
  fila,
  nombreUbic,
}: {
  fila: FilaVista
  nombreUbic: (r: RefUbicacion) => string
}) {
  // Borrador local del input; null = mostrar el valor guardado.
  const [borrador, setBorrador] = useState<string | null>(null)

  const commit = async (texto: string) => {
    const limpio = texto.trim()
    if (limpio === '') {
      await guardarSaldoRealDeclarado(String(fila.ubicacion), fila.activo, '')
      setBorrador(null)
      return
    }
    const interno = aDecimalDominio(limpio)
    if (interno === undefined) {
      // Entrada no numérica: se descarta el borrador y se restaura lo guardado.
      setBorrador(null)
      return
    }
    await guardarSaldoRealDeclarado(String(fila.ubicacion), fila.activo, interno)
    setBorrador(null)
  }

  const valorMostrado = borrador ?? (fila.saldoReal !== null ? fmtDecimal(fila.saldoReal) : '')

  return (
    <tr>
      <td className="font-medium">{nombreUbic(fila.ubicacion)}</td>
      <td>{fila.activo}</td>
      <td data-num>{fmtDecimal(fila.saldoCalculado)}</td>
      <td data-num>
        <input
          className={`${INPUT_SISTEMA} inline-block w-36 text-right tabular-nums`}
          inputMode="decimal"
          placeholder="—"
          aria-label={`Saldo real de ${fila.activo} en ${nombreUbic(fila.ubicacion)}`}
          value={valorMostrado}
          onChange={(e) => setBorrador(e.target.value)}
          onBlur={(e) => void commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') setBorrador(null)
          }}
        />
      </td>
      <td data-num>
        {fila.diferencia !== null ? fmtDecimal(fila.diferencia) : <span className="text-texto-mudo">—</span>}
      </td>
      <td>
        {fila.estado ? (
          <Chip tono={TONO_SEMAFORO[fila.estado]}>{fila.estado}</Chip>
        ) : (
          <span className="text-apoyo text-texto-mudo">sin declarar</span>
        )}
      </td>
    </tr>
  )
}
