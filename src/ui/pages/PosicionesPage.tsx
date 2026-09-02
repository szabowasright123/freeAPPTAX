/**
 * PosicionesPage — pestaña «Posiciones» (fase D1–D6).
 *
 * Una posición agrupa las patas de un mismo hecho económico a lo largo del tiempo:
 * aportación → recompensas → retirada. Sin esta vista, esas patas quedan desperdigadas por
 * el Diario en orden cronológico y reconstruir qué pasó con un pool es un ejercicio de
 * arqueología. Con ella, la operativa DeFi se vuelve legible.
 *
 * La posición NO participa en SALDOS ni en FIFO: es un índice sobre los apuntes. Todo lo que
 * se muestra aquí sale del motor o de los propios apuntes.
 *
 * Era la única de las diecinueve rutas SIN `<h1>`: su título era un `<h2>` maquetado a mano,
 * del mismo tamaño que los `<h1>` de las demás pero un nivel por debajo en el esquema de
 * encabezados (diagnóstico §1). Desde D7 usa el `PageHeader` del sistema, y su lista de
 * posiciones sigue tomando el nombre prestado del título con `aria-labelledby`.
 */
import { useMemo, useState } from 'react'
import {
  listarPosiciones,
  listarApuntes,
  listarUbicaciones,
  actualizarPosicion,
  eliminarPosicion,
} from '../../data/repositorio'
import { useLiveQuery } from '../../data/useLiveQuery'
import {
  ETIQUETA_EVENTO,
  ETIQUETA_TIPO,
  esZonaGris,
  type Apunte,
  type EstadoPosicion,
} from '../../engine/types'
import { fmtEuro, fmtFechaHora } from '../formato'
import {
  BTN_PELIGRO_SISTEMA,
  BTN_PRIMARIO,
  Banner,
  Card,
  Chip,
  EmptyState,
  INPUT_SISTEMA,
  PageHeader,
  Tabla,
} from '../comp'
import { AsistenteEvento } from '../defi/AsistenteEvento'
import { ChipZonaGris } from '../defi/ChipZonaGris'

const ETIQUETA_ESTADO: Record<EstadoPosicion, string> = {
  abierta: 'Abierta',
  cerrada: 'Cerrada',
  liquidada: 'Liquidada',
}

export function PosicionesPage() {
  const posicionesQ = useLiveQuery(listarPosiciones, [])
  const apuntesQ = useLiveQuery(listarApuntes, [])
  const ubicacionesQ = useLiveQuery(listarUbicaciones, [])

  const posiciones = posicionesQ.estado === 'listo' ? posicionesQ.datos : []
  const apuntes = apuntesQ.estado === 'listo' ? apuntesQ.datos : []
  const ubicaciones = ubicacionesQ.estado === 'listo' ? ubicacionesQ.datos : []

  const [asistente, setAsistente] = useState(false)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /** Patas de cada posición, en orden cronológico. */
  const patasPorPosicion = useMemo(() => {
    const m = new Map<string, Apunte[]>()
    for (const ap of apuntes) {
      if (!ap.posicionId) continue
      const lista = m.get(ap.posicionId) ?? []
      lista.push(ap)
      m.set(ap.posicionId, lista)
    }
    for (const lista of m.values()) lista.sort((a, b) => a.fechaHora.localeCompare(b.fechaHora))
    return m
  }, [apuntes])

  async function cerrarPosicion(id: string, estado: EstadoPosicion) {
    const patas = patasPorPosicion.get(id) ?? []
    const ultima = patas[patas.length - 1]?.fechaHora
    await actualizarPosicion(id, {
      estado,
      ...(estado !== 'abierta' && ultima ? { fechaCierre: ultima } : {}),
    })
  }

  async function borrar(id: string) {
    setError(null)
    try {
      await eliminarPosicion(id)
    } catch (e) {
      // Con apuntes colgando no se borra en silencio: se pide confirmación explícita.
      const msg = e instanceof Error ? e.message : String(e)
      if (
        window.confirm(
          `${msg}\n\n¿Borrar la posición de todos modos? Los apuntes NO se borran: ` +
            'solo se les quita la referencia.',
        )
      ) {
        await eliminarPosicion(id, true)
      } else {
        setError(msg)
      }
    }
  }

  const abiertas = posiciones.filter((p) => p.estado === 'abierta')

  return (
    <div className="space-y-5">
      <PageHeader
        idTitulo="pos-titulo"
        titulo="Posiciones"
        subtitulo={`${posiciones.length} posición(es) · ${abiertas.length} abierta(s). Agrupan las patas de un mismo evento a lo largo del tiempo.`}
        acciones={
          <button type="button" className={BTN_PRIMARIO} onClick={() => setAsistente(true)}>
            + Nuevo evento DeFi
          </button>
        }
      />

      {error && <Banner tono="error" onCerrar={() => setError(null)}>{error}</Banner>}

      {posiciones.length === 0 ? (
        <EmptyState
          titulo="Todavía no hay posiciones"
          descripcion="Empieza por un evento: staking, préstamo, pool o derivado."
        />
      ) : (
        <div className="space-y-3" role="list" aria-labelledby="pos-titulo">
          {posiciones.map((p) => {
            const patas = patasPorPosicion.get(p.id) ?? []
            const desplegada = abierta === p.id
            return (
              <Card key={p.id} as="div" role="listitem" relleno="sin">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <button
                    type="button"
                    className="flex-1 text-left"
                    aria-expanded={desplegada}
                    aria-controls={`pos-patas-${p.id}`}
                    onClick={() => setAbierta(desplegada ? null : p.id)}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-cuerpo font-medium text-texto">{p.protocolo}</span>
                      <span className="text-caption uppercase tracking-wide text-texto-mudo">
                        {p.tipoPosicion}
                      </span>
                      <Chip tono={p.estado === 'abierta' ? 'ok' : 'neutro'}>
                        {ETIQUETA_ESTADO[p.estado]}
                      </Chip>
                      <span className="text-apoyo text-texto-mudo">
                        {patas.length} apunte(s) · desde {fmtFechaHora(p.fechaApertura)}
                      </span>
                    </span>
                  </button>
                  <div className="flex items-center gap-2">
                    <select
                      className={`${INPUT_SISTEMA} w-32`}
                      value={p.estado}
                      aria-label={`Estado de la posición ${p.protocolo}`}
                      onChange={(e) => cerrarPosicion(p.id, e.target.value as EstadoPosicion)}
                    >
                      <option value="abierta">Abierta</option>
                      <option value="cerrada">Cerrada</option>
                      <option value="liquidada">Liquidada</option>
                    </select>
                    <button
                      type="button"
                      className={BTN_PELIGRO_SISTEMA}
                      aria-label={`Borrar la posición ${p.protocolo}`}
                      onClick={() => borrar(p.id)}
                    >
                      Borrar
                    </button>
                  </div>
                </div>

                {desplegada && (
                  <div id={`pos-patas-${p.id}`} className="border-t border-borde px-4 py-3">
                    {patas.length === 0 ? (
                      <p className="text-cuerpo text-texto-mudo">
                        Sin apuntes vinculados todavía.
                      </p>
                    ) : (
                      <Tabla
                        densidad="compacta"
                        aria-label={`Apuntes de la posición ${p.protocolo}`}
                      >
                        <thead>
                          <tr>
                            <th scope="col">Nº</th>
                            <th scope="col">Fecha</th>
                            <th scope="col">Tipo</th>
                            <th scope="col">Evento</th>
                            <th scope="col" data-num>Movimiento</th>
                            <th scope="col" data-num>Contravalor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {patas.map((ap) => (
                            <tr key={ap.id}>
                              <td className="font-mono text-apoyo">{ap.id}</td>
                              <td className="whitespace-nowrap">{fmtFechaHora(ap.fechaHora)}</td>
                              <td className="whitespace-nowrap font-medium">
                                {ETIQUETA_TIPO[ap.tipo]}
                              </td>
                              <td>
                                <span className="flex items-center gap-1.5">
                                  {ap.evento ? ETIQUETA_EVENTO[ap.evento] : '—'}
                                  {esZonaGris(ap.evento) && <ChipZonaGris apunte={ap} />}
                                </span>
                              </td>
                              <td data-num className="whitespace-nowrap">
                                {ap.activoSalida && `− ${ap.cantidadSalida} ${ap.activoSalida} `}
                                {ap.activoEntrada && `+ ${ap.cantidadEntrada} ${ap.activoEntrada}`}
                              </td>
                              <td data-num className="whitespace-nowrap">
                                {fmtEuro(ap.contravalorEUR)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Tabla>
                    )}
                    {p.notas && <p className="mt-2 text-cuerpo text-texto-secundario">{p.notas}</p>}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <AsistenteEvento
        abierto={asistente}
        onCerrar={() => setAsistente(false)}
        ubicaciones={ubicaciones}
      />
    </div>
  )
}
