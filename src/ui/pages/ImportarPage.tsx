/**
 * ImportarPage — importación desde EXPLORADORES DE BLOQUES (ENCARGO, Parte 2).
 *
 * Criterio del autor (16-08-2026), opción (a): la app **no consulta ninguna cadena ni
 * ningún explorador**. El alumno descarga sus CSV (Etherscan, BscScan, Arbiscan…) y los
 * sube aquí. Cero llamadas de red (Regla de oro 3) y la dirección del alumno no se revela
 * a ningún tercero.
 *
 * La pantalla es una BANDEJA DE TRIAJE, no un importador: un explorador da movimientos,
 * no operaciones. Cada movimiento se propone con lo que sí se puede deducir y **nada entra
 * en el Diario sin que el alumno lo confirme**. La única propuesta con confianza alta es el
 * traslado entre direcciones propias registradas.
 */
import { useMemo, useState } from 'react'
import {
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  Banner,
  Card,
  Chip,
  INPUT_SISTEMA,
  PageHeader,
  Tabla,
} from '../comp'
import { leerArchivoTexto } from '../descargas'
import { irA } from '../shell/rutas'
import { fmtDecimal, fmtFechaHora } from '../formato'
import {
  CATALOGO_TIPOS,
  TIPOS_OPERACION,
  UBICACION_EXTERIOR,
  type Activo,
  type TipoOperacion,
} from '../../engine/types'
import { useLiveQuery } from '../../data/useLiveQuery'
import {
  agregarApuntes,
  crearActivo,
  listarActivos,
  listarUbicaciones,
} from '../../data/repositorio'
import { indexarDirecciones } from '../../data/import/direcciones'
import {
  leerCsvExplorador,
  unirLecturas,
  type LecturaExplorador,
} from '../../data/import/explorador'
import {
  proponerCandidatos,
  candidatosABorradores,
  type CandidatoApunte,
} from '../../data/import/triaje'

/** Ficheros ya leídos en esta sesión de importación. */
interface FicheroLeido {
  nombre: string
  lectura: LecturaExplorador
}

/** Acorta una dirección larga para la tabla: 0x1234…abcd. */
function corta(d: string): string {
  if (d.length <= 14) return d || '—'
  return `${d.slice(0, 8)}…${d.slice(-4)}`
}

const ETIQUETA_CLASE: Record<LecturaExplorador['clase'], string> = {
  normal: 'transacciones normales',
  erc20: 'tokens ERC-20',
  internas: 'transacciones internas',
}

export function ImportarPage() {
  const ubicaciones = useLiveQuery(listarUbicaciones, [])
  const activos = useLiveQuery(listarActivos, [])
  const [ficheros, setFicheros] = useState<FicheroLeido[]>([])
  const [candidatos, setCandidatos] = useState<CandidatoApunte[]>([])
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<string | null>(null)

  const listaUbic = ubicaciones.datos ?? []
  const indice = useMemo(() => indexarDirecciones(listaUbic), [listaUbic])
  const conDirecciones = listaUbic.filter((u) => (u.direcciones?.length ?? 0) > 0)

  /** Lee un CSV y recalcula la bandeja con TODOS los ficheros cargados. */
  const cargar = async (file: File) => {
    setError(null)
    setResultado(null)
    try {
      const texto = await leerArchivoTexto(file)
      const lectura = leerCsvExplorador(texto, file.name)
      const nuevos = [...ficheros.filter((f) => f.nombre !== file.name), { nombre: file.name, lectura }]
      setFicheros(nuevos)
      const { movimientos } = unirLecturas(nuevos.map((f) => f.lectura))
      setCandidatos(proponerCandidatos(movimientos, indice))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  /** Vuelve a proponer con las direcciones actuales (tras registrar alguna nueva). */
  const reproponer = () => {
    const { movimientos } = unirLecturas(ficheros.map((f) => f.lectura))
    setCandidatos(proponerCandidatos(movimientos, indice))
    setResultado(null)
  }

  const limpiar = () => {
    setFicheros([])
    setCandidatos([])
    setError(null)
    setResultado(null)
  }

  const cambiar = (clave: string, cambios: Partial<CandidatoApunte>) =>
    setCandidatos((cs) => cs.map((c) => (c.clave === clave ? { ...c, ...cambios } : c)))

  const marcados = candidatos.filter((c) => c.incluir)
  const sinCalificar = marcados.filter((c) => c.tipo === '')
  const listos = marcados.filter((c) => c.tipo !== '')

  /** Da de alta los activos que aparecen en la importación y aún no están en el catálogo. */
  const altaActivosNuevos = async (): Promise<string[]> => {
    const conocidos = new Set((activos.datos ?? []).map((a) => a.simbolo))
    const nuevos = [...new Set(listos.map((c) => c.activo))].filter((s) => s && !conocidos.has(s))
    for (const simbolo of nuevos) {
      const activo: Activo = { simbolo, nombre: simbolo, decimales: 8, esFiat: false }
      await crearActivo(activo)
    }
    return nuevos
  }

  const anadir = async () => {
    setError(null)
    try {
      const borradores = candidatosABorradores(candidatos)
      if (borradores.length === 0) {
        setError('No hay ningún movimiento marcado Y calificado que añadir.')
        return
      }
      const activosNuevos = await altaActivosNuevos()
      const res = await agregarApuntes(borradores)
      const partes = [
        `${res.anadidos} apunte(s) añadidos al Diario`,
        res.duplicados > 0 ? `${res.duplicados} descartado(s) por estar ya en el Libro` : '',
        res.cambios.length > 0 ? `${res.cambios.length} correlativo(s) renumerados` : '',
        activosNuevos.length > 0 ? `activos dados de alta: ${activosNuevos.join(', ')}` : '',
      ].filter((p) => p !== '')
      setResultado(`${partes.join(' · ')}. Complétalos en el Diario: les falta el contravalor en euros.`)
      // Los ya añadidos dejan de estar marcados (si se reimportan, se deduplican igual).
      setCandidatos((cs) => cs.map((c) => (c.incluir && c.tipo !== '' ? { ...c, incluir: false } : c)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="space-y-5">
      {/* El <h1> copia el rótulo de la subpestaña (rutas.ts): «Importar cadena». Lo que era
          título, «Importar desde un explorador», es el sobretítulo (decisión D2, aplicada en D4). */}
      <PageHeader
        sobretitulo="Importar desde un explorador"
        titulo="Importar cadena"
        subtitulo={
          <>
            Sube los CSV que descargues del explorador de cada cadena. La app{' '}
            <strong>no consulta ninguna cadena</strong>: nada sale de tu navegador, y ningún
            movimiento entra en el Diario sin que tú lo confirmes.
          </>
        }
      />

      {error && <Banner tono="error" onCerrar={() => setError(null)}>{error}</Banner>}
      {resultado && <Banner tono="exito" onCerrar={() => setResultado(null)}>{resultado}</Banner>}

      {conDirecciones.length === 0 && (
        <Banner tono="info">
          Ninguna de tus ubicaciones tiene direcciones registradas. Sin ellas no puedo saber qué
          movimientos son traslados tuyos: todo quedará por calificar.{' '}
          <button type="button" className="underline underline-offset-2" onClick={() => irA('ajustes')}>
            Revisar los ajustes
          </button>
          .
        </Banner>
      )}

      {/* ── 1 · Ficheros ──────────────────────────────────────────────── */}
      <Card
        titulo="1 · Sube los CSV de la cadena"
        subtitulo={
          <>
            De cada cadena hacen falta <strong>hasta tres exportaciones</strong>: transacciones
            normales (solo el activo nativo), tokens ERC-20 y transacciones internas. Súbelas
            todas: la app las une y deduplica por transacción.
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <label className={`${BTN_PRIMARIO} cursor-pointer`}>
            + Añadir CSV
            <input
              type="file"
              accept=".csv,text/csv"
              multiple
              className="hidden"
              onChange={async (e) => {
                const fs = [...(e.target.files ?? [])]
                e.target.value = ''
                for (const f of fs) await cargar(f)
              }}
            />
          </label>
          {ficheros.length > 0 && (
            <>
              <button type="button" className={BTN_SECUNDARIO} onClick={reproponer}>
                Volver a proponer
              </button>
              <button type="button" className={BTN_SECUNDARIO} onClick={limpiar}>
                Vaciar bandeja
              </button>
            </>
          )}
        </div>

        {ficheros.length > 0 && (
          <ul className="mt-3 space-y-1 text-cuerpo">
            {ficheros.map((f) => (
              <li key={f.nombre} className="text-texto-secundario">
                <span className="font-mono text-apoyo">{f.nombre}</span> — {ETIQUETA_CLASE[f.lectura.clase]}
                {f.lectura.activoNativo ? ` (${f.lectura.activoNativo})` : ''} ·{' '}
                {f.lectura.movimientos.length} movimiento(s)
                {f.lectura.filasRechazadas.length > 0 && (
                  <span className="text-texto-mudo">
                    {' '}· {f.lectura.filasRechazadas.length} fila(s) sin valor ni comisión
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ── 2 · Bandeja de triaje ─────────────────────────────────────── */}
      {candidatos.length > 0 && (
        <Card
          titulo="2 · Confirma cada movimiento"
          subtitulo="El explorador no sabe si un envío es traslado o transmisión, ni el contravalor en
            euros (da dólares, y solo del activo nativo). Lo pones tú: el criterio de qué anotar
            permite revisar cada movimiento antes de incorporarlo."
          acciones={
            <span className="text-cuerpo text-texto-secundario">
              {candidatos.length} movimiento(s) · {marcados.length} marcado(s) ·{' '}
              {sinCalificar.length} sin calificar
            </span>
          }
        >
          <div className="mt-3">
            <Tabla>
              <caption className="sr-only">Movimientos leídos del explorador, pendientes de confirmación</caption>
              <thead>
                <tr>
                  <th scope="col">Añadir</th>
                  <th scope="col">Fecha (local)</th>
                  <th scope="col">Movimiento</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Origen</th>
                  <th scope="col">Destino</th>
                  <th scope="col">Contravalor €</th>
                </tr>
              </thead>
              <tbody>
                {candidatos.map((c) => (
                  <tr key={c.clave} className="align-top">
                    <td>
                      <input
                        type="checkbox"
                        checked={c.incluir}
                        aria-label={`Añadir el movimiento ${c.clave}`}
                        onChange={(e) => cambiar(c.clave, { incluir: e.target.checked })}
                      />
                    </td>
                    <td className="whitespace-nowrap">{fmtFechaHora(c.movimiento.fechaHora)}</td>
                    <td>
                      <div className="font-medium">
                        {c.cantidad === '0' ? '—' : `${fmtDecimal(c.cantidad)} ${c.activo}`}
                        {c.comisionCantidad && (
                          <span className="ml-2 text-apoyo font-normal text-texto-secundario">
                            comisión {fmtDecimal(c.comisionCantidad)} {c.comisionActivo}
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-caption text-texto-mudo">
                        {corta(c.movimiento.desde)} → {corta(c.movimiento.hacia)}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1">
                        <Sello confianza={c.confianza} />
                        <span className="text-caption text-texto-secundario">{c.motivo}</span>
                      </div>
                    </td>
                    <td>
                      <select
                        className={INPUT_SISTEMA}
                        aria-label={`Tipo del movimiento ${c.clave}`}
                        value={c.tipo}
                        onChange={(e) => cambiar(c.clave, { tipo: e.target.value as TipoOperacion | '' })}
                      >
                        <option value="">— sin calificar —</option>
                        {(c.sugerencias.length > 0 ? c.sugerencias : TIPOS_OPERACION).map((t) => (
                          <option key={t} value={t}>
                            {CATALOGO_TIPOS[t].etiqueta}
                          </option>
                        ))}
                        {c.sugerencias.length > 0 && (
                          <optgroup label="Otros tipos del catálogo">
                            {TIPOS_OPERACION.filter((t) => !c.sugerencias.includes(t)).map((t) => (
                              <option key={t} value={t}>
                                {CATALOGO_TIPOS[t].etiqueta}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </td>
                    <td>
                      <SelectUbicacion
                        valor={c.ubicacionOrigen}
                        etiqueta={`Origen del movimiento ${c.clave}`}
                        ubicaciones={listaUbic.map((u) => ({ id: u.id, nombre: u.nombre }))}
                        onCambio={(v) => cambiar(c.clave, { ubicacionOrigen: v })}
                      />
                    </td>
                    <td>
                      <SelectUbicacion
                        valor={c.ubicacionDestino}
                        etiqueta={`Destino del movimiento ${c.clave}`}
                        ubicaciones={listaUbic.map((u) => ({ id: u.id, nombre: u.nombre }))}
                        onCambio={(v) => cambiar(c.clave, { ubicacionDestino: v })}
                      />
                    </td>
                    <td>
                      <input
                        className={`${INPUT_SISTEMA} w-28`}
                        inputMode="decimal"
                        placeholder="pendiente"
                        aria-label={`Contravalor en euros del movimiento ${c.clave}`}
                        value={c.contravalorEUR ?? ''}
                        onChange={(e) =>
                          cambiar(c.clave, {
                            contravalorEUR: e.target.value.trim().replace(',', '.') || undefined,
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className={BTN_PRIMARIO} onClick={anadir} disabled={listos.length === 0}>
              Añadir al Diario ({listos.length})
            </button>
            {sinCalificar.length > 0 && (
              <span className="text-cuerpo text-semaforo-revisar dark:text-amber-300">
                {sinCalificar.length} movimiento(s) marcados siguen sin tipo: no se añadirán.
              </span>
            )}
          </div>
          <p className="mt-2 text-apoyo text-texto-secundario">
            Se añaden <strong>sin borrar</strong> lo que ya hay, deduplicando por transacción, y el
            diario se renumera si entran en medio. Los apuntes nacen <strong>sin contravalor en
            euros</strong>: la validación del Libro te los marcará como pendientes.
          </p>
        </Card>
      )}
    </div>
  )
}

/** Sello de confianza de la propuesta, con el Chip del sistema. */
function Sello({ confianza }: { confianza: CandidatoApunte['confianza'] }) {
  const mapa = {
    alta: { texto: 'traslado propio', tono: 'ok' },
    pendiente: { texto: 'lo calificas tú', tono: 'revisar' },
    ajeno: { texto: 'no es tuyo', tono: 'neutro' },
  }[confianza] as { texto: string; tono: 'ok' | 'revisar' | 'neutro' }
  return (
    <Chip tono={mapa.tono}>
      <span className="uppercase tracking-wide">{mapa.texto}</span>
    </Chip>
  )
}

/** Selector de ubicación con EXTERIOR incluido. */
function SelectUbicacion({
  valor,
  etiqueta,
  ubicaciones,
  onCambio,
}: {
  valor: string
  etiqueta: string
  ubicaciones: { id: string; nombre: string }[]
  onCambio: (v: string) => void
}) {
  return (
    <select
      className={INPUT_SISTEMA}
      aria-label={etiqueta}
      value={valor}
      onChange={(e) => onCambio(e.target.value)}
    >
      <option value={UBICACION_EXTERIOR}>EXTERIOR</option>
      {ubicaciones.map((u) => (
        <option key={u.id} value={u.id}>
          {u.nombre}
        </option>
      ))}
    </select>
  )
}
