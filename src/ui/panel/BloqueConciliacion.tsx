/**
 * BloqueConciliacion — bloque 4 del Panel, y el corazón del Panel.
 *
 * `conciliarFifoSaldos` compara, activo a activo, las existencias vivas de la cola FIFO
 * contra la suma de saldos. Las dos cifras salen del mismo diario, así que —salvo error de
 * clasificación— tienen que coincidir.
 *
 * Por qué hay dos comprobaciones y no una, que es lo que la pantalla debe dejar claro de un
 * vistazo:
 *
 *   · el CUADRE mira hacia FUERA: saldo calculado contra el saldo real que el alumno lee en
 *     el exchange. Contesta «¿me falta un apunte?» y por eso NO puede ver un error de
 *     clasificación: si el bitcoin donado bajó del saldo, el saldo cuadra igual;
 *   · la CONCILIACIÓN mira hacia DENTRO: ese mismo saldo contra la cola FIFO. Contesta
 *     «¿está bien clasificado?» y solo falla por eso.
 *
 * Es el «error invisible» de [MT] U6.2 y la casilla de cierre a 31 de diciembre del Anexo D.
 *
 * Cada fila descuadrada muestra su motivo con el texto que exporta el propio motor
 * (`TEXTO_MOTIVO`, Regla de oro 5: el texto no se reescribe aquí) y despliega los apuntes
 * implicados, que es donde el alumno tiene que ir a arreglarlo.
 */
import { useMemo, useState } from 'react'
import type { Apunte, EstadoSemaforo } from '../../engine/types'
import {
  TEXTO_MOTIVO,
  type FilaConciliacion,
  type ResultadoConciliacion,
} from '../../engine/conciliacion'
import { irA } from '../shell/rutas'
import { fmtCantidad, fmtDecimal, fmtFechaHora } from '../formato'
import { BTN_SECUNDARIO, Card, Tabla, Chip } from '../comp'

/** El semáforo como Chip del sistema: la misma lengua visual que el CUADRE, más visible que
 *  el punto de 12 px de antes (diagnóstico §4). El tono lleva sus colores de siempre. */
const TONO_SEMAFORO: Record<EstadoSemaforo, 'ok' | 'revisar' | 'error'> = {
  OK: 'ok',
  REVISAR: 'revisar',
  ERROR: 'error',
}

export function BloqueConciliacion({
  conciliacion,
  apuntes,
}: {
  conciliacion: ResultadoConciliacion
  apuntes: Apunte[]
}) {
  const [abierta, setAbierta] = useState<string | null>(null)

  const porId = useMemo(() => new Map(apuntes.map((a) => [a.id, a])), [apuntes])

  return (
    <Card aria-labelledby="panel-conciliacion-titulo">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 id="panel-conciliacion-titulo" className="text-titulo font-semibold tracking-tight text-texto">
              4 · Conciliación FIFO ↔ saldos
            </h2>
            <p className="text-apoyo text-texto-secundario">
              El cuadre mira hacia fuera («¿me falta un apunte?»); la conciliación mira hacia
              dentro y compara ese mismo saldo con la cola FIFO («¿está bien clasificado?»).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Chip tono={TONO_SEMAFORO[conciliacion.estadoGlobal]}>{conciliacion.estadoGlobal}</Chip>
            {conciliacion.activosDescuadrados > 0 && (
              <span className="text-apoyo text-texto-secundario">
                {conciliacion.activosDescuadrados} activo
                {conciliacion.activosDescuadrados === 1 ? '' : 's'} sin conciliar
              </span>
            )}
          </div>
        </div>

        {conciliacion.filas.length === 0 ? (
          <p className="text-apoyo text-texto-mudo">
            No hay ningún activo con cola FIFO ni saldo que conciliar.
          </p>
        ) : (
          <Tabla>
            <caption className="sr-only">
              Conciliación por activo entre las existencias vivas de la cola FIFO y la suma de
              saldos. Las filas descuadradas se despliegan con su motivo y sus apuntes.
            </caption>
            <thead>
              <tr>
                <th scope="col">Activo</th>
                <th scope="col" data-num>Existencias FIFO</th>
                <th scope="col" data-num>Suma de saldos</th>
                <th scope="col" data-num>Diferencia</th>
                <th scope="col">Estado</th>
                <th scope="col">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {conciliacion.filas.map((f) => (
                <FilaConciliacionVista
                  key={f.activo}
                  fila={f}
                  porId={porId}
                  desplegada={abierta === f.activo}
                  onAlternar={() => setAbierta(abierta === f.activo ? null : f.activo)}
                />
              ))}
            </tbody>
          </Tabla>
        )}

        <p className="text-apoyo text-texto-mudo">
          El euro y las demás monedas fiat del catálogo quedan fuera: son moneda de cuenta y no
          abren cola FIFO, de modo que conciliarlas daría siempre un descuadre por el importe
          entero del saldo.
        </p>
      </div>
    </Card>
  )
}

/** Una fila de la conciliación y, desplegada, su motivo y los apuntes implicados. */
function FilaConciliacionVista({
  fila,
  porId,
  desplegada,
  onAlternar,
}: {
  fila: FilaConciliacion
  porId: Map<string, Apunte>
  desplegada: boolean
  onAlternar: () => void
}) {
  const idDetalle = `panel-conciliacion-detalle-${fila.activo.replace(/\W+/g, '-')}`
  const descuadra = fila.estado !== 'OK'

  return (
    <>
      <tr
        className={
          (descuadra ? 'bg-red-50/60 hover:bg-red-50/60 dark:bg-red-950/20 dark:hover:bg-red-950/20 ' : '') +
          (desplegada ? 'font-medium ' : '')
        }
      >
        <th scope="row">{fila.activo}</th>
        <td data-num className="tabular-nums" title={fila.existenciasFifo}>
          {fmtCantidad(fila.existenciasFifo)}
        </td>
        <td data-num className="tabular-nums" title={fila.saldoTotal}>
          {fmtCantidad(fila.saldoTotal)}
        </td>
        <td
          data-num
          title={fila.diferencia}
          className={'tabular-nums ' + (descuadra ? 'font-semibold text-semaforo-error' : '')}
        >
          {fmtCantidad(fila.diferencia)}
        </td>
        <td>
          <Chip tono={TONO_SEMAFORO[fila.estado]}>{fila.estado}</Chip>
        </td>
        <td>
          {descuadra ? (
            <button
              type="button"
              onClick={onAlternar}
              aria-expanded={desplegada}
              aria-controls={idDetalle}
              aria-label={`${desplegada ? 'Ocultar' : 'Ver'} el motivo del descuadre de ${fila.activo}`}
              className="rounded-control px-1.5 py-0.5 text-apoyo underline decoration-dotted underline-offset-4 hover:bg-superficie focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <span aria-hidden="true">{desplegada ? '▾ ' : '▸ '}</span>
              Ver por qué
            </button>
          ) : (
            <span className="text-apoyo text-texto-mudo">Concilia</span>
          )}
        </td>
      </tr>

      {desplegada && descuadra && (
        <tr id={idDetalle}>
          <td colSpan={6} className="space-y-3 bg-superficie">
            <ul className="space-y-2">
              {fila.motivos.map((m) => (
                <li
                  key={m}
                  className="rounded-control border border-amber-300 bg-amber-50 px-4 py-3 text-cuerpo text-amber-900 sm:px-5 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
                >
                  {/* Relleno de 16/20 px como en `Banner` y en la Unidad del manual
                      (29-8-2026): la frase llena el ancho de la caja, pero deja de ir pegada
                      al marco teñido. Sin tope de medida, por la misma decisión. */}
                  {TEXTO_MOTIVO[m]}
                </li>
              ))}
            </ul>

            <ApuntesImplicados ids={fila.apuntesImplicados} porId={porId} />
          </td>
        </tr>
      )}
    </>
  )
}

/** Los apuntes que el motor señala como causa, con lo justo para reconocerlos. */
function ApuntesImplicados({
  ids,
  porId,
}: {
  ids: readonly string[]
  porId: Map<string, Apunte>
}) {
  if (ids.length === 0) {
    return (
      <p className="text-apoyo text-texto-mudo">
        El motor no ha podido señalar apuntes concretos: hay que revisar el diario de este
        activo apunte a apunte.
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      <h3 className="text-cuerpo font-semibold text-texto">
        Apuntes implicados ({ids.length})
      </h3>
      <Tabla densidad="compacta">
        <caption className="sr-only">Apuntes que causan el descuadre.</caption>
        <thead>
          <tr>
            <th scope="col">Apunte</th>
            <th scope="col">Fecha</th>
            <th scope="col">Tipo</th>
            <th scope="col">Sentido</th>
            <th scope="col">Movimiento</th>
          </tr>
        </thead>
        <tbody>
          {ids.map((id) => {
            const ap = porId.get(id)
            return (
              <tr key={id}>
                <td className="font-mono">{id}</td>
                <td className="whitespace-nowrap">{fmtFechaHora(ap?.fechaHora)}</td>
                <td>{ap?.tipo ?? '—'}</td>
                <td>
                  {ap?.sentido ?? <span className="text-semaforo-error">sin indicar</span>}
                </td>
                <td>
                  {ap?.cantidadSalida && ap.activoSalida
                    ? `− ${fmtDecimal(ap.cantidadSalida)} ${ap.activoSalida}`
                    : ''}
                  {ap?.cantidadEntrada && ap.activoEntrada
                    ? ` + ${fmtDecimal(ap.cantidadEntrada)} ${ap.activoEntrada}`
                    : ''}
                  {!ap && '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </Tabla>
      <button type="button" className={`${BTN_SECUNDARIO} mt-1`} onClick={() => irA('diario')}>
        Abrir el Diario para corregirlos
      </button>
    </div>
  )
}
