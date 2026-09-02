/**
 * BloqueFifo — bloque 2 del Panel: la cola FIFO, activo por activo, con drill-down.
 *
 * Por activo, los totales de su cola (`calcularFifo`): adquirido, consumido, restante y el
 * coste del restante. Al desplegarlo, las dos mitades de las que salen esos totales:
 *
 *  · los LOTES ABIERTOS —lo que queda vivo, con su fecha, su cantidad inicial, la que aún no
 *    se ha consumido y su coste unitario—, y
 *  · las TRANSMISIONES, cada una con su valor de transmisión neto, su coste FIFO, su
 *    resultado y, al desplegarla, LOS LOTES CONCRETOS QUE CONSUMIÓ (`ConsumoFifo`).
 *
 * Ese último desplegable es el bloque entero: ver que una venta se ha llevado el lote de
 * enero y medio lote de marzo es lo que hace visible el «primero que entra, primero que
 * sale». Sin él, el coste FIFO es un número que hay que creerse.
 *
 * Dos marcas en las transmisiones, ambas del motor:
 *  · `saldoFifoInsuficiente` en rojo — la cola no cubría la cantidad transmitida y la parte
 *    descubierta va a coste cero, que infla el resultado. Es la «trampa del coste cero».
 *  · `lucrativa` — donación entregada. El motor calcula el resultado igual y lo marca; la
 *    pérdida de una transmisión lucrativa ínter vivos no se computa (art. 33.5.c LIRPF).
 */
import { useMemo, useState } from 'react'
import type { ResultadoTransmision, SimboloActivo } from '../../engine/types'
import type { ResultadoFifoActivo } from '../../engine/fifo'
import { fmtCantidad, fmtEuro, fmtFecha } from '../formato'
import { Card, Tabla } from '../comp'
import { useCuerpoVirtual } from './virtual'

/** Literal del art. 33.5.c LIRPF (Regla de oro 5: se copia, no se parafrasea). */
const LITERAL_33_5_C =
  'No se computarán como pérdidas patrimoniales […] las debidas a transmisiones lucrativas ' +
  'por actos ínter vivos o a liberalidades.'


/** Altos estimados (px) de las filas para el virtualizador, con la densidad `compacta` de
 *  `Tabla` (fila ≈ 33 px, medida). Solo se usan por encima de 60 filas y basta con que sean
 *  verosímiles (`ui/panel/virtual.ts`). El detalle abierto de una transmisión mide, medido,
 *  la fila (33) + su base (párrafo + cabecera de la tabla de consumos ≈ 78-80) + una fila de
 *  33 por consumo. */
const ALTO_TRANSMISION = 33
const ALTO_DETALLE_BASE = 80
const ALTO_CONSUMO = 33

export function BloqueFifo({ fifo }: { fifo: Map<SimboloActivo, ResultadoFifoActivo> }) {
  const [abierto, setAbierto] = useState<SimboloActivo | null>(null)

  const activos = useMemo(() => [...fifo.keys()].sort((a, b) => a.localeCompare(b, 'es')), [fifo])

  if (activos.length === 0) return null

  return (
    <Card aria-labelledby="panel-fifo-titulo">
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 id="panel-fifo-titulo" className="text-titulo font-semibold tracking-tight text-texto">
            2 · Cola FIFO
          </h2>
          <p className="text-apoyo text-texto-secundario">
            Cola única global por activo, sin distinguir ubicación. Abre un activo para ver sus
            lotes vivos y sus transmisiones, y abre una transmisión para ver de qué lotes salió
            su coste.
          </p>
        </div>

        <Tabla>
          <caption className="sr-only">
            Totales de la cola FIFO por activo. Cada activo se despliega con sus lotes
            abiertos y sus transmisiones.
          </caption>
          <thead>
            <tr>
              <th scope="col">Activo</th>
              <th scope="col" data-num>Adquirido</th>
              <th scope="col" data-num>Consumido</th>
              <th scope="col" data-num>Restante</th>
              <th scope="col" data-num>Coste restante</th>
              <th scope="col" data-num>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {activos.map((activo) => {
              const cola = fifo.get(activo)
              if (!cola) return null
              const desplegado = abierto === activo
              const idDetalle = `panel-fifo-detalle-${activo.replace(/\W+/g, '-')}`
              return (
                <FilaActivo
                  key={activo}
                  activo={activo}
                  cola={cola}
                  desplegado={desplegado}
                  idDetalle={idDetalle}
                  onAlternar={() => setAbierto(desplegado ? null : activo)}
                />
              )
            })}
          </tbody>
        </Tabla>
      </div>
    </Card>
  )
}

/** Una fila de activo con los totales de su cola y, desplegada, lotes y transmisiones. */
function FilaActivo({
  activo,
  cola,
  desplegado,
  idDetalle,
  onAlternar,
}: {
  activo: SimboloActivo
  cola: ResultadoFifoActivo
  desplegado: boolean
  idDetalle: string
  onAlternar: () => void
}) {
  return (
    <>
      <tr className={desplegado ? 'bg-superficie-acento hover:bg-superficie-acento' : ''}>
        <th scope="row">{activo}</th>
        <td data-num className="tabular-nums" title={cola.resumen.adquiridoTotal}>
          {fmtCantidad(cola.resumen.adquiridoTotal)}
        </td>
        <td data-num className="tabular-nums" title={cola.resumen.consumidoTotal}>
          {fmtCantidad(cola.resumen.consumidoTotal)}
        </td>
        <td data-num className="font-medium tabular-nums" title={cola.resumen.restanteTotal}>
          {fmtCantidad(cola.resumen.restanteTotal)}
        </td>
        <td data-num className="tabular-nums">{fmtEuro(cola.resumen.costeRestanteEUR)}</td>
        <td data-num>
          <button
            type="button"
            onClick={onAlternar}
            aria-expanded={desplegado}
            aria-controls={idDetalle}
            aria-label={`${desplegado ? 'Ocultar' : 'Ver'} la cola FIFO de ${activo}`}
            className="rounded-control px-2 py-0.5 text-apoyo underline decoration-dotted underline-offset-4 hover:bg-superficie focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <span aria-hidden="true">{desplegado ? '▾ ' : '▸ '}</span>
            {cola.resumen.lotesAbiertos.length} lote
            {cola.resumen.lotesAbiertos.length === 1 ? '' : 's'} ·{' '}
            {cola.transmisiones.length} transmisi
            {cola.transmisiones.length === 1 ? 'ón' : 'ones'}
          </button>
        </td>
      </tr>
      {desplegado && (
        <tr id={idDetalle}>
          <td colSpan={6} className="space-y-4 bg-superficie">
            <LotesAbiertos cola={cola} activo={activo} />
            <Transmisiones cola={cola} activo={activo} />
          </td>
        </tr>
      )}
    </>
  )
}

/** Lo que sigue vivo en la cola: fecha, cantidad inicial, restante y coste unitario. */
function LotesAbiertos({ cola, activo }: { cola: ResultadoFifoActivo; activo: SimboloActivo }) {
  const lotes = cola.resumen.lotesAbiertos
  const cuerpo = useCuerpoVirtual(lotes.length, () => 33)

  if (lotes.length === 0) {
    return (
      <p className="text-apoyo text-texto-mudo">
        No queda ningún lote abierto de {activo}: la cola está consumida por completo.
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      <h3 className="text-cuerpo font-semibold text-texto">Lotes abiertos ({lotes.length})</h3>
      <Tabla
        densidad="compacta"
        contenedorRef={cuerpo.contenedorRef}
        contenedorClassName="max-h-72 overflow-y-auto"
      >
        <caption className="sr-only">Lotes de {activo} aún no consumidos.</caption>
        <thead className="sticky top-0 z-10">
          <tr>
            <th scope="col">Lote (apunte)</th>
            <th scope="col">Fecha</th>
            <th scope="col" data-num>Cantidad inicial</th>
            <th scope="col" data-num>Cantidad restante</th>
            <th scope="col" data-num>Coste unitario</th>
          </tr>
        </thead>
        <tbody>
          {cuerpo.padTop > 0 && (
            <tr aria-hidden="true">
              <td colSpan={5} style={{ height: cuerpo.padTop }} />
            </tr>
          )}
          {cuerpo.indices.map((i) => {
            const l = lotes[i]
            if (!l) return null
            return (
              <tr key={l.apunteId}>
                <td className="font-mono">{l.apunteId}</td>
                <td className="whitespace-nowrap">{fmtFecha(l.fechaHora)}</td>
                <td data-num title={l.cantidadInicial}>{fmtCantidad(l.cantidadInicial)}</td>
                <td data-num className="font-medium" title={l.cantidadRestante}>
                  {fmtCantidad(l.cantidadRestante)}
                </td>
                <td data-num>{fmtEuro(l.costeUnitarioEUR)}</td>
              </tr>
            )
          })}
          {cuerpo.padBottom > 0 && (
            <tr aria-hidden="true">
              <td colSpan={5} style={{ height: cuerpo.padBottom }} />
            </tr>
          )}
        </tbody>
      </Tabla>
    </div>
  )
}

/** Las transmisiones del activo; cada una se abre con los lotes que consumió. */
function Transmisiones({ cola, activo }: { cola: ResultadoFifoActivo; activo: SimboloActivo }) {
  const [abierta, setAbierta] = useState<string | null>(null)
  const trans = cola.transmisiones

  const indiceAbierta = trans.findIndex((t) => t.apunteId === abierta)
  const cuerpo = useCuerpoVirtual(
    trans.length,
    (i) => {
      if (i !== indiceAbierta) return ALTO_TRANSMISION
      const consumos = trans[i]?.consumos.length ?? 0
      return ALTO_TRANSMISION + ALTO_DETALLE_BASE + consumos * ALTO_CONSUMO
    },
    [indiceAbierta],
  )

  if (trans.length === 0) {
    return (
      <p className="text-apoyo text-texto-mudo">
        Todavía no hay ninguna transmisión de {activo}: nada ha salido de la cola.
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      <h3 className="text-cuerpo font-semibold text-texto">Transmisiones ({trans.length})</h3>
      <Tabla
        densidad="compacta"
        contenedorRef={cuerpo.contenedorRef}
        contenedorClassName="max-h-96 overflow-y-auto"
      >
        <caption className="sr-only">
          Transmisiones de {activo}. Cada una se despliega con los lotes que consumió.
        </caption>
        <thead className="sticky top-0 z-10">
          <tr>
            <th scope="col">Apunte</th>
            <th scope="col">Fecha</th>
            <th scope="col" data-num>Cantidad</th>
            <th scope="col" data-num>Valor transmisión neto</th>
            <th scope="col" data-num>Coste FIFO</th>
            <th scope="col" data-num>Resultado</th>
            <th scope="col" data-num>Lotes</th>
          </tr>
        </thead>
        <tbody>
          {cuerpo.padTop > 0 && (
            <tr aria-hidden="true">
              <td colSpan={7} style={{ height: cuerpo.padTop }} />
            </tr>
          )}
          {cuerpo.indices.map((i) => {
            const t = trans[i]
            if (!t) return null
            return (
              <FilaTransmision
                key={t.apunteId}
                transmision={t}
                desplegada={t.apunteId === abierta}
                onAlternar={() => setAbierta(t.apunteId === abierta ? null : t.apunteId)}
              />
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

/** Una transmisión y, desplegada, los lotes concretos que consumió. */
function FilaTransmision({
  transmision: t,
  desplegada,
  onAlternar,
}: {
  transmision: ResultadoTransmision
  desplegada: boolean
  onAlternar: () => void
}) {
  const idDetalle = `panel-fifo-consumos-${t.apunteId.replace(/\W+/g, '-')}`
  const perdida = t.resultadoEUR.startsWith('-')
  return (
    <>
      <tr
        className={
          (t.saldoFifoInsuficiente ? 'bg-red-50 hover:bg-red-50 dark:bg-red-950/30 dark:hover:bg-red-950/30 ' : '') +
          (desplegada ? 'font-medium ' : '')
        }
      >
        <td className="font-mono">
          <span className="flex items-center gap-1">
            {t.apunteId}
            {t.saldoFifoInsuficiente && (
              <span
                title={`Faltaron ${fmtCantidad(t.cantidadSinCoste)} sin lote de coste`}
                className="rounded-control bg-red-600 px-1 text-caption font-semibold text-white"
              >
                SIN COSTE
              </span>
            )}
            {t.lucrativa && (
              <span
                title={LITERAL_33_5_C}
                className="rounded-control border border-violet-400 px-1 text-caption font-semibold text-violet-700 dark:border-violet-700 dark:text-violet-300"
              >
                LUCRATIVA
              </span>
            )}
          </span>
        </td>
        <td className="whitespace-nowrap">{fmtFecha(t.fechaHora)}</td>
        <td data-num title={t.cantidad}>{fmtCantidad(t.cantidad)}</td>
        <td data-num>{fmtEuro(t.valorTransmisionNetoEUR)}</td>
        <td data-num className={t.saldoFifoInsuficiente ? 'font-semibold text-semaforo-error' : ''}>
          {fmtEuro(t.costeFifoEUR)}
        </td>
        <td
          data-num
          className={
            'font-medium ' +
            (perdida ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400')
          }
        >
          {fmtEuro(t.resultadoEUR)}
        </td>
        <td data-num>
          <button
            type="button"
            onClick={onAlternar}
            aria-expanded={desplegada}
            aria-controls={idDetalle}
            aria-label={`${desplegada ? 'Ocultar' : 'Ver'} los lotes consumidos por el apunte ${t.apunteId}`}
            className="rounded-control px-1.5 py-0.5 underline decoration-dotted underline-offset-4 hover:bg-superficie focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <span aria-hidden="true">{desplegada ? '▾ ' : '▸ '}</span>
            {t.consumos.length}
          </button>
        </td>
      </tr>
      {desplegada && (
        <tr id={idDetalle}>
          <td colSpan={7} className="bg-superficie">
            <ConsumosDeTransmision transmision={t} />
          </td>
        </tr>
      )}
    </>
  )
}

/** El «primero que entra, primero que sale», hecho lista: qué lotes pagó esta transmisión. */
function ConsumosDeTransmision({ transmision: t }: { transmision: ResultadoTransmision }) {
  return (
    <div className="space-y-2">
      <p className="text-apoyo text-texto-secundario">
        Lotes consumidos por {t.apunteId}, del más antiguo al más reciente. La suma de sus
        costes imputados es el coste FIFO de la transmisión:{' '}
        <span className="font-medium tabular-nums text-texto">{fmtEuro(t.costeFifoEUR)}</span>.
      </p>

      {t.consumos.length > 0 ? (
        <Tabla densidad="compacta">
          <caption className="sr-only">Lotes consumidos por el apunte {t.apunteId}.</caption>
          <thead>
            <tr>
              <th scope="col">Lote (apunte)</th>
              <th scope="col" data-num>Cantidad consumida</th>
              <th scope="col" data-num>Coste imputado</th>
            </tr>
          </thead>
          <tbody>
            {t.consumos.map((c) => (
              <tr key={c.loteApunteId}>
                <td className="font-mono">{c.loteApunteId}</td>
                <td data-num title={c.cantidadConsumida}>{fmtCantidad(c.cantidadConsumida)}</td>
                <td data-num>{fmtEuro(c.costeImputadoEUR)}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      ) : (
        <p className="text-apoyo text-texto-mudo">
          Esta transmisión no consumió ningún lote de la cola.
        </p>
      )}

      {t.saldoFifoInsuficiente && (
        <p className="rounded-control border border-red-300 bg-red-50 px-2 py-1.5 text-apoyo text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          La cola no cubría la cantidad transmitida:{' '}
          <span className="tabular-nums font-medium">{fmtCantidad(t.cantidadSinCoste)}</span> se
          quedaron sin lote de coste y van a coste cero, lo que infla el resultado. Falta
          registrar la adquisición que precede a esta salida ([MT] U2.5).
        </p>
      )}

      {t.lucrativa && (
        <p className="rounded-control border border-violet-300 bg-violet-50 px-2 py-1.5 text-apoyo text-violet-900 dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-200">
          Donación entregada: transmisión lucrativa ínter vivos. La ganancia se computa; la
          pérdida no. Art. 33.5.c LIRPF: «{LITERAL_33_5_C}»
        </p>
      )}
    </div>
  )
}
