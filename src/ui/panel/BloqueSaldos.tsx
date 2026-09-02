/**
 * BloqueSaldos — bloque 1 del Panel: la hoja SALDOS con drill-down.
 *
 * La rejilla ubicación x activo del motor (`calcularSaldos`) con sus cuatro columnas
 * —entradas, salidas, comisiones y saldo— y la alerta roja del saldo negativo, que en el
 * taller significa siempre lo mismo: una salida sin origen registrado ([MT] U7).
 *
 * Lo que lo convierte en Panel y no en tabla es el desplegable: al abrir una celda aparecen
 * los apuntes que la mueven, en orden cronológico, cada uno con su aportación firmada y —la
 * columna que importa— el saldo acumulado tras él. Esa columna es la que deja ver de dónde
 * sale la cifra, que es la diferencia entre explicar el saldo y enseñarlo.
 */
import { useMemo, useState } from 'react'
import type { Apunte, RefUbicacion, SaldoCelda, SimboloActivo } from '../../engine/types'
import { fmtDecimal, fmtFechaHora } from '../formato'
import { Card, Tabla, Banner } from '../comp'
import { claveCelda, type RejillaSaldos } from './modelo'
import { movimientosDeCelda, ETIQUETA_CONCEPTO } from './movimientos'
import { useCuerpoVirtual } from './virtual'

/** Alto de fila del desplegable (px). Sirve al virtualizador para estimar el scroll. */
const ALTO_FILA = 33

interface CeldaAbierta {
  ubicacion: RefUbicacion
  activo: SimboloActivo
}

export function BloqueSaldos({
  apuntes,
  rejilla,
  nombreUbic,
}: {
  apuntes: Apunte[]
  rejilla: RejillaSaldos
  nombreUbic: (r: RefUbicacion) => string
}) {
  const [abierta, setAbierta] = useState<CeldaAbierta | null>(null)

  // Solo las celdas con movimiento: la rejilla completa de la plantilla estaba llena de
  // huecos porque el Excel tenía un tamaño fijo; aquí no hace falta fingirlo.
  const filas = useMemo<SaldoCelda[]>(() => {
    const out: SaldoCelda[] = []
    for (const u of rejilla.ubicaciones) {
      for (const a of rejilla.activos) {
        const c = rejilla.celdas.get(claveCelda(u, a))
        if (c) out.push(c)
      }
    }
    return out
  }, [rejilla])

  if (filas.length === 0) return null

  return (
    <Card aria-labelledby="panel-saldos-titulo">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 id="panel-saldos-titulo" className="text-titulo font-semibold tracking-tight text-texto">
              1 · Saldos
            </h2>
            <p className="text-apoyo text-texto-secundario">
              Saldo = entradas − salidas − comisiones, por ubicación y activo. Abre una fila
              para ver los apuntes que la mueven y el saldo acumulado tras cada uno.
            </p>
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="Total por activo">
            {rejilla.activos.map((a) => (
              <li
                key={a}
                className="rounded-pildora border border-borde px-2.5 py-0.5 text-apoyo"
              >
                <span className="font-semibold text-texto">{a}</span>{' '}
                <span className="tabular-nums text-texto-secundario">{fmtDecimal(rejilla.totalPorActivo.get(a))}</span>
              </li>
            ))}
          </ul>
        </div>

        {rejilla.hayNegativos && (
          <Banner tono="error">
            Hay saldos negativos. Un saldo negativo es siempre una salida sin su origen
            registrado: falta el apunte que trajo esas unidades ([MT] U7).
          </Banner>
        )}

        <Tabla>
          <caption className="sr-only">
            Saldos por ubicación y activo. Cada fila se despliega con los apuntes que la
            mueven y su saldo acumulado.
          </caption>
          <thead>
            <tr>
              <th scope="col">Ubicación</th>
              <th scope="col">Activo</th>
              <th scope="col" data-num>Entradas</th>
              <th scope="col" data-num>Salidas</th>
              <th scope="col" data-num>Comisiones</th>
              <th scope="col" data-num>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((c) => {
              const clave = claveCelda(c.ubicacion, c.activo)
              const idDetalle = `panel-saldo-detalle-${clave.replace(/\W+/g, '-')}`
              const desplegada =
                abierta !== null && abierta.ubicacion === c.ubicacion && abierta.activo === c.activo
              return (
                <FilaSaldo
                  key={clave}
                  celda={c}
                  apuntes={apuntes}
                  nombreUbic={nombreUbic}
                  desplegada={desplegada}
                  idDetalle={idDetalle}
                  onAlternar={() =>
                    setAbierta(
                      desplegada ? null : { ubicacion: c.ubicacion, activo: c.activo },
                    )
                  }
                />
              )
            })}
          </tbody>
        </Tabla>
      </div>
    </Card>
  )
}

/** Una fila de la rejilla y, si está desplegada, su detalle debajo. */
function FilaSaldo({
  celda,
  apuntes,
  nombreUbic,
  desplegada,
  idDetalle,
  onAlternar,
}: {
  celda: SaldoCelda
  apuntes: Apunte[]
  nombreUbic: (r: RefUbicacion) => string
  desplegada: boolean
  idDetalle: string
  onAlternar: () => void
}) {
  const rotulo = `${celda.activo} en ${nombreUbic(celda.ubicacion)}`
  return (
    <>
      <tr className={desplegada ? 'bg-superficie-acento hover:bg-superficie-acento' : ''}>
        <th scope="row">{nombreUbic(celda.ubicacion)}</th>
        <td>{celda.activo}</td>
        <td data-num className="tabular-nums">{fmtDecimal(celda.entradas)}</td>
        <td data-num className="tabular-nums">{fmtDecimal(celda.salidas)}</td>
        <td data-num className="tabular-nums">{fmtDecimal(celda.comisiones)}</td>
        <td data-num>
          <button
            type="button"
            onClick={onAlternar}
            aria-expanded={desplegada}
            aria-controls={idDetalle}
            aria-label={`${desplegada ? 'Ocultar' : 'Ver'} los apuntes que mueven ${rotulo}`}
            className={
              'inline-flex items-center gap-1.5 rounded-control px-1.5 py-0.5 tabular-nums underline ' +
              'decoration-dotted underline-offset-4 hover:bg-superficie focus:outline-none ' +
              'focus-visible:ring-2 focus-visible:ring-brand-500 ' +
              (celda.negativo ? 'font-semibold text-semaforo-error' : '')
            }
          >
            <span aria-hidden="true" className="text-caption text-texto-mudo">
              {desplegada ? '▾' : '▸'}
            </span>
            {fmtDecimal(celda.saldo)}
          </button>
        </td>
      </tr>
      {desplegada && (
        <tr id={idDetalle}>
          <td colSpan={6} className="bg-superficie">
            <DetalleCelda
              apuntes={apuntes}
              ubicacion={celda.ubicacion}
              activo={celda.activo}
              saldoFinal={celda.saldo}
              nombreUbic={nombreUbic}
            />
          </td>
        </tr>
      )}
    </>
  )
}

/** Los apuntes que mueven una celda, con su aportación y el saldo acumulado tras cada uno. */
function DetalleCelda({
  apuntes,
  ubicacion,
  activo,
  saldoFinal,
  nombreUbic,
}: {
  apuntes: Apunte[]
  ubicacion: RefUbicacion
  activo: SimboloActivo
  saldoFinal: string
  nombreUbic: (r: RefUbicacion) => string
}) {
  const movimientos = useMemo(
    () => movimientosDeCelda(apuntes, ubicacion, activo),
    [apuntes, ubicacion, activo],
  )
  const cuerpo = useCuerpoVirtual(movimientos.length, () => ALTO_FILA)

  if (movimientos.length === 0) {
    return <p className="text-apoyo text-texto-mudo">Ningún apunte mueve esta celda.</p>
  }

  return (
    <div className="space-y-2">
      <p className="text-apoyo text-texto-secundario">
        {movimientos.length} movimiento{movimientos.length === 1 ? '' : 's'} de {activo} en{' '}
        {nombreUbic(ubicacion)}. La última línea del acumulado es el saldo de la fila:{' '}
        <span className="tabular-nums font-medium text-texto">{fmtDecimal(saldoFinal)}</span>.
      </p>
      <Tabla
        densidad="compacta"
        contenedorRef={cuerpo.contenedorRef}
        contenedorClassName="max-h-80 overflow-y-auto"
      >
        <caption className="sr-only">
          Apuntes que mueven el saldo de {activo} en {nombreUbic(ubicacion)}, en orden
          cronológico, con su aportación y el saldo acumulado.
        </caption>
        <thead className="sticky top-0 z-10">
          <tr>
            <th scope="col">Apunte</th>
            <th scope="col">Fecha</th>
            <th scope="col">Tipo</th>
            <th scope="col">Concepto</th>
            <th scope="col">Contraparte</th>
            <th scope="col" data-num>Aportación</th>
            <th scope="col" data-num>Acumulado</th>
          </tr>
        </thead>
        <tbody>
          {cuerpo.padTop > 0 && (
            <tr aria-hidden="true">
              <td colSpan={7} style={{ height: cuerpo.padTop }} />
            </tr>
          )}
          {cuerpo.indices.map((i) => {
            const m = movimientos[i]
            if (!m) return null
            const negativa = m.aportacion.startsWith('-')
            return (
              <tr key={`${m.apunteId}-${m.concepto}`}>
                <td className="font-mono">{m.apunteId}</td>
                <td className="whitespace-nowrap">{fmtFechaHora(m.fechaHora)}</td>
                <td>{m.tipo}</td>
                <td>{ETIQUETA_CONCEPTO[m.concepto]}</td>
                <td>{m.contraparte ? nombreUbic(m.contraparte) : '—'}</td>
                <td
                  data-num
                  className={negativa ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}
                >
                  {negativa ? '' : '+'}
                  {fmtDecimal(m.aportacion)}
                </td>
                <td data-num className="font-medium">{fmtDecimal(m.acumulado)}</td>
              </tr>
            )
          })}
          {cuerpo.padBottom > 0 && (
            <tr aria-hidden="true">
              <td colSpan={7} style={{ height: cuerpo.padBottom }} />
            </tr>
          )}
        </tbody>
      </Tabla>
    </div>
  )
}
