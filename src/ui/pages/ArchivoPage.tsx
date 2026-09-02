/**
 * ArchivoPage — El Archivo (expediente probatorio, P5).
 *
 * Cuatro vistas sobre los justificantes del Libro:
 *  1. Resumen: nº de justificantes y espacio local que ocupan sus ficheros.
 *  2. Informe de completitud probatoria por ejercicio: % de apuntes con expediente
 *     completo y lista de huecos priorizada (PÉRDIDA, DONACIÓN y no-KYC primero).
 *  3. Explorador por carpeta convencional, con buscador.
 *  4. Huérfanos: justificantes sin apunte y apuntes sin justificante.
 *
 * El cálculo (checklist, estado, huecos, huérfanos) vive en el motor (`engine/archivo`);
 * aquí solo presentación y acciones sobre la base (borrar/descargar justificantes).
 */
import { useMemo, useState } from 'react'
import type { RutaConvencional, TipoOperacion } from '../../engine/types'
import { ETIQUETA_TIPO } from '../../engine/types'
import {
  CARPETAS_ARCHIVO,
  CHECKLIST_PROBATORIA,
  ETIQUETA_CARPETA,
  detectarHuerfanos,
  informeCompletitud,
  mapaKyc,
  type HuecoProbatorio,
} from '../../engine/archivo'
import type { JustificanteRegistro } from '../../data/tipos'
import {
  listarRegistros,
  listarJustificantes,
  listarUbicaciones,
  aDominio,
  justificantesADominio,
  eliminarJustificante,
} from '../../data/repositorio'
import { useLiveQuery } from '../../data/useLiveQuery'
import { descargarBlob } from '../descargas'
import { fmtBytes, fmtFecha, fmtFechaHora } from '../formato'
import { BadgeEstadoProbatorio } from '../archivo/EstadoProbatorio'
import {
  BTN_SECUNDARIO_COMPACTO,
  Banner,
  Card,
  Chip,
  EmptyState,
  Field,
  INPUT_SISTEMA,
  PageHeader,
} from '../comp'

/**
 * El «Borrar» de cada justificante, en voz baja: una acción destructiva repetida 87 veces no
 * debe competir con el dato (diagnóstico §4). Mismo patrón que el quitar de D4 en
 * `SeccionJustificantes`: texto rojo del semáforo que solo se subraya al pasar por encima.
 */
const BTN_BORRAR_DISCRETO =
  'rounded-control px-1 text-apoyo text-semaforo-error underline-offset-2 hover:underline ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-red-400'

/** Etiqueta legible de un documento a partir de su clave y el tipo del apunte. */
function etiquetaDocumento(tipo: TipoOperacion | undefined, clave: string): string {
  if (clave === 'otros') return 'Otro documento'
  const req = tipo ? CHECKLIST_PROBATORIA[tipo].requisitos.find((r) => r.clave === clave) : undefined
  return req?.documento ?? clave
}

export function ArchivoPage() {
  const registrosQ = useLiveQuery(listarRegistros, [])
  const justificantesQ = useLiveQuery(listarJustificantes, [])
  const ubicacionesQ = useLiveQuery(listarUbicaciones, [])

  const registros = registrosQ.estado === 'listo' ? registrosQ.datos : []
  const justificantes = justificantesQ.estado === 'listo' ? justificantesQ.datos : []
  const ubicaciones = ubicacionesQ.estado === 'listo' ? ubicacionesQ.datos : []

  const [busqueda, setBusqueda] = useState('')
  const [ejercicio, setEjercicio] = useState<string>('')
  const [aviso, setAviso] = useState<string | null>(null)

  // Dominio para el motor.
  const apuntes = useMemo(() => aDominio([...registros]), [registros])
  const justificantesDom = useMemo(
    () => justificantesADominio(justificantes, registros),
    [justificantes, registros],
  )
  const kyc = useMemo(() => mapaKyc(ubicaciones), [ubicaciones])

  const apuntePorUid = useMemo(
    () => new Map(registros.map((r) => [r.uid, r])),
    [registros],
  )

  const espacioUsado = useMemo(
    () => justificantes.reduce((acc, j) => acc + (j.fichero?.size ?? 0), 0),
    [justificantes],
  )

  const ejercicios = useMemo(
    () => [...new Set(registros.map((r) => r.fechaHora.slice(0, 4)))].sort(),
    [registros],
  )

  const informe = useMemo(
    () => informeCompletitud(apuntes, justificantesDom, kyc, ejercicio ? Number(ejercicio) : undefined),
    [apuntes, justificantesDom, kyc, ejercicio],
  )

  const huerfanos = useMemo(
    () => detectarHuerfanos(apuntes, justificantesDom),
    [apuntes, justificantesDom],
  )

  // Justificantes agrupados por carpeta, con el apunte resuelto y filtro de búsqueda.
  const porCarpeta = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const mapa = new Map<RutaConvencional, FilaJustificante[]>()
    for (const j of justificantes) {
      const apRegistro = apuntePorUid.get(j.apunteUid)
      const tipo = apRegistro?.tipo
      const fila: FilaJustificante = {
        registro: j,
        apunteCorrelativo: apRegistro?.id ?? '(huérfano)',
        apunteTipo: tipo,
        documento: etiquetaDocumento(tipo, j.tipoDocumento),
        fechaApunte: apRegistro?.fechaHora,
      }
      if (q) {
        const heno = [
          fila.apunteCorrelativo,
          fila.documento,
          j.tipoDocumento,
          j.rutaConvencional,
          ETIQUETA_CARPETA[j.rutaConvencional],
          j.referenciaExterna,
          j.notas,
          j.hashSHA256,
          tipo ? ETIQUETA_TIPO[tipo] : '',
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!heno.includes(q)) continue
      }
      const lista = mapa.get(j.rutaConvencional)
      if (lista) lista.push(fila)
      else mapa.set(j.rutaConvencional, [fila])
    }
    return mapa
  }, [justificantes, apuntePorUid, busqueda])

  const totalFiltrado = useMemo(
    () => [...porCarpeta.values()].reduce((n, l) => n + l.length, 0),
    [porCarpeta],
  )

  const borrar = async (j: JustificanteRegistro) => {
    if (!window.confirm('¿Borrar este justificante del Archivo?')) return
    await eliminarJustificante(j.id)
    setAviso('Justificante borrado.')
  }

  const descargar = (j: JustificanteRegistro) => {
    if (!j.fichero) return
    const nombre = (j.tipoDocumento || 'justificante') + nombreExtension(j.fichero.type)
    descargarBlob(nombre, j.fichero)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Archivo"
        subtitulo={
          <>
            El expediente probatorio: «¿cómo lo demuestro?». {justificantes.length} justificante(s) ·{' '}
            {fmtBytes(espacioUsado)} en tu navegador.
          </>
        }
      />

      {aviso && (
        <Banner tono="exito" onCerrar={() => setAviso(null)}>
          {aviso}
        </Banner>
      )}

      {/* 1 · Informe de completitud */}
      <Card aria-labelledby="archivo-completitud">
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="archivo-completitud" className="text-titulo font-semibold tracking-tight text-texto">
              Completitud probatoria
            </h2>
            <Field etiqueta="Ejercicio">
              <select
                className={`${INPUT_SISTEMA} w-32`}
                value={ejercicio}
                onChange={(e) => setEjercicio(e.target.value)}
                aria-label="Ejercicio del informe"
              >
                <option value="">Todos</option>
                {ejercicios.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <BarraCompletitud informe={informe} />

          {informe.huecos.length === 0 ? (
            <p className="text-cuerpo text-semaforo-ok dark:text-green-400">
              {informe.total === 0
                ? 'No hay apuntes en este ejercicio.'
                : 'Todos los apuntes tienen su expediente completo. 🎉'}
            </p>
          ) : (
            <div>
              <p className="mb-2 text-cuerpo text-texto-secundario">
                Huecos priorizados ({informe.huecos.length}) — primero los de mayor exigencia
                probatoria (PÉRDIDA, DONACIÓN) y las adquisiciones sin KYC:
              </p>
              <ul className="space-y-1.5">
                {informe.huecos.slice(0, 30).map((h) => (
                  <ListaHueco key={h.apunte.id} hueco={h} />
                ))}
                {informe.huecos.length > 30 && (
                  <li className="text-apoyo text-texto-mudo">… y {informe.huecos.length - 30} más.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {/* 2 · Explorador por carpeta */}
      <Card aria-labelledby="archivo-explorador">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="archivo-explorador" className="text-titulo font-semibold tracking-tight text-texto">
              Explorador por carpeta
            </h2>
            <input
              className={`${INPUT_SISTEMA} w-64 max-w-full`}
              placeholder="Buscar documento, apunte, hash, carpeta…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar en el Archivo"
            />
          </div>

          {justificantes.length === 0 ? (
            <EmptyState
              icono="📎"
              titulo="Aún no hay justificantes"
              descripcion="Adjúntalos desde el formulario de cada apunte (Diario)."
            />
          ) : totalFiltrado === 0 ? (
            <EmptyState
              icono="🔍"
              titulo="Ningún justificante coincide con la búsqueda"
              descripcion="Prueba con el correlativo del apunte, el nombre del documento o la carpeta."
            />
          ) : (
            <div className="space-y-4">
              {CARPETAS_ARCHIVO.map((c) => {
                const filas = porCarpeta.get(c.ruta)
                if (!filas || filas.length === 0) return null
                return (
                  <div key={c.ruta}>
                    <h3 className="mb-1.5 flex items-center gap-2 text-cuerpo font-semibold text-texto">
                      <span className="font-mono text-apoyo font-normal text-texto-mudo">{c.ruta}/</span>
                      {c.etiqueta}
                      <Chip>{filas.length}</Chip>
                    </h3>
                    <ul className="divide-y divide-borde rounded-panel border border-borde bg-superficie-elevada">
                      {filas.map((f) => (
                        <FilaJustificanteVista
                          key={f.registro.id}
                          fila={f}
                          onBorrar={() => borrar(f.registro)}
                          onDescargar={() => descargar(f.registro)}
                        />
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>

      {/* 3 · Huérfanos */}
      <Card aria-labelledby="archivo-huerfanos">
        <div className="space-y-3">
          <h2 id="archivo-huerfanos" className="text-titulo font-semibold tracking-tight text-texto">
            Huérfanos
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-1 text-cuerpo font-medium text-semaforo-error dark:text-red-400">
                Justificantes sin apunte ({huerfanos.justificantesSinApunte.length})
              </h3>
              {huerfanos.justificantesSinApunte.length === 0 ? (
                <p className="text-apoyo text-texto-mudo">Ninguno. Todo justificante está ligado a un apunte.</p>
              ) : (
                <ul className="space-y-1 text-cuerpo text-texto">
                  {huerfanos.justificantesSinApunte.map((j) => (
                    <li key={j.id} className="flex items-center justify-between gap-2">
                      <span className="text-texto-secundario">
                        {etiquetaDocumento(undefined, j.tipoDocumento)} · {ETIQUETA_CARPETA[j.rutaConvencional]}
                      </span>
                      <button
                        type="button"
                        className={BTN_BORRAR_DISCRETO}
                        onClick={() => {
                          const reg = justificantes.find((r) => r.id === j.id)
                          if (reg) void borrar(reg)
                        }}
                      >
                        Borrar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-1 text-cuerpo font-medium text-semaforo-revisar dark:text-amber-400">
                Apuntes sin justificante ({huerfanos.apuntesSinJustificante.length})
              </h3>
              {huerfanos.apuntesSinJustificante.length === 0 ? (
                <p className="text-apoyo text-texto-mudo">Ninguno. Todos los apuntes tienen algún justificante.</p>
              ) : (
                <ul className="max-h-48 space-y-1 overflow-y-auto text-cuerpo text-texto">
                  {huerfanos.apuntesSinJustificante.map((a) => (
                    <li key={a.id} className="flex items-center gap-2">
                      <span className="font-mono text-apoyo text-texto-mudo">{a.id}</span>
                      <span>{ETIQUETA_TIPO[a.tipo]}</span>
                      <span className="text-apoyo text-texto-mudo">{fmtFecha(a.fechaHora)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ── Subcomponentes ──────────────────────────────────────────────────────────

/** Fila de justificante ya resuelta contra su apunte. */
interface FilaJustificante {
  registro: JustificanteRegistro
  apunteCorrelativo: string
  apunteTipo?: TipoOperacion
  documento: string
  fechaApunte?: string
}

/**
 * Barra de progreso de la completitud, en el semáforo de siempre: los tres estados
 * probatorios (completo / incompleto / sin justificar) con los tres colores del cuadre,
 * los mismos que sus chips. Antes era un verde único que no decía de qué se componía el resto.
 */
function BarraCompletitud({ informe }: { informe: ReturnType<typeof informeCompletitud> }) {
  const pct = (n: number) => (informe.total > 0 ? (n / informe.total) * 100 : 0)
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 text-cuerpo">
        <span className="font-medium text-texto">
          {informe.porcentajeCompleto}% con expediente completo
        </span>
        <span className="text-apoyo text-texto-mudo">
          {informe.completos} completos · {informe.incompletos} incompletos ·{' '}
          {informe.sinJustificar} sin justificar · {informe.total} apuntes
        </span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-pildora bg-borde">
        <div className="h-full bg-semaforo-ok transition-all" style={{ width: `${pct(informe.completos)}%` }} />
        <div className="h-full bg-semaforo-revisar transition-all" style={{ width: `${pct(informe.incompletos)}%` }} />
        <div className="h-full bg-semaforo-error transition-all" style={{ width: `${pct(informe.sinJustificar)}%` }} />
      </div>
    </div>
  )
}

/** Un hueco del informe (apunte incompleto o sin justificar). */
function ListaHueco({ hueco }: { hueco: HuecoProbatorio }) {
  const { apunte, estado, faltantes } = hueco
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-control border border-borde px-2.5 py-1.5 text-cuerpo text-texto">
      <span className="font-mono text-apoyo text-texto-mudo">{apunte.id}</span>
      <span className="font-medium">{ETIQUETA_TIPO[apunte.tipo]}</span>
      <span className="text-apoyo text-texto-mudo">{fmtFecha(apunte.fechaHora)}</span>
      <BadgeEstadoProbatorio estado={estado} />
      <span className="text-apoyo text-texto-secundario">
        Falta: {faltantes.map((f) => f.documento).join(', ') || '—'}
      </span>
    </li>
  )
}

/** Fila del explorador: un justificante con sus acciones. */
function FilaJustificanteVista({
  fila,
  onBorrar,
  onDescargar,
}: {
  fila: FilaJustificante
  onBorrar: () => void
  onDescargar: () => void
}) {
  const j = fila.registro
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-cuerpo text-texto">
      <span className="font-medium">{fila.documento}</span>
      <span className="inline-flex items-center gap-1 text-apoyo text-texto-mudo">
        <span className="font-mono">{fila.apunteCorrelativo}</span>
        {fila.apunteTipo && <span>· {ETIQUETA_TIPO[fila.apunteTipo]}</span>}
        {fila.fechaApunte && <span>· {fmtFechaHora(fila.fechaApunte)}</span>}
      </span>
      {j.fichero ? (
        <span className="text-apoyo text-semaforo-ok dark:text-green-400">📎 {fmtBytes(j.fichero.size)}</span>
      ) : j.referenciaExterna ? (
        // La referencia externa es el dato que PRUEBA de dónde sale el justificante: se lee
        // entera o no sirve. Venía topada a `max-w-[16rem]` con `truncate`, que recortaba 79
        // de ellas en el caso de ejemplo y lo hacía igual a 1.152, 1.440 y 1.600 px (no era
        // el contenedor: era el tope fijo). Ahora envuelve: `min-w-0` para poder encoger
        // dentro del flex y `overflow-wrap: anywhere`, que corta por espacios como cualquier
        // texto —el campo suele llevar una frase: «Bit2Me › orden BTC/EUR del 09/01/2025
        // (PDF)»— y solo parte por caracteres cuando un token suelto (una URL, una ruta, un
        // txid) no cabe ni él solo. Sin `title`: ya no hay nada escondido que revelar.
        <span className="min-w-0 text-apoyo text-texto-mudo [overflow-wrap:anywhere]">
          🔗 {j.referenciaExterna}
        </span>
      ) : (
        <span className="text-apoyo text-semaforo-revisar dark:text-amber-400">sin fichero ni referencia</span>
      )}
      {j.hashSHA256 && (
        <span className="font-mono text-caption text-texto-mudo" title={`SHA-256: ${j.hashSHA256}`}>
          {j.hashSHA256.slice(0, 12)}…
        </span>
      )}
      <span className="ml-auto flex items-center gap-2">
        {j.fichero && (
          <button type="button" className={BTN_SECUNDARIO_COMPACTO} onClick={onDescargar}>
            Descargar
          </button>
        )}
        <button type="button" className={BTN_BORRAR_DISCRETO} onClick={onBorrar}>
          Borrar
        </button>
      </span>
    </li>
  )
}

// ── Utilidades locales ──────────────────────────────────────────────────────

/** Extensión de fichero según el MIME (mínima; para nombrar la descarga). */
function nombreExtension(mime: string | undefined): string {
  if (!mime) return ''
  if (mime === 'application/pdf') return '.pdf'
  if (mime === 'image/png') return '.png'
  if (mime === 'image/jpeg') return '.jpg'
  if (mime.startsWith('text/')) return '.txt'
  return ''
}
