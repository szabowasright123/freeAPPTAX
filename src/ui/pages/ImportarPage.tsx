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
import { useEffect, useMemo, useState } from 'react'
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
import { fmtDecimal, fmtFechaHora } from '../formato'
import {
  CATALOGO_TIPOS,
  TIPOS_OPERACION,
  UBICACION_EXTERIOR,
  type Activo,
  type TipoOperacion,
  type TipoUbicacion,
} from '../../engine/types'
import { useLiveQuery } from '../../data/useLiveQuery'
import {
  agregarApuntes,
  crearActivo,
  crearUbicacion,
  actualizarUbicacion,
  listarActivos,
  listarUbicaciones,
} from '../../data/repositorio'
import { indexarDirecciones, normalizarDireccion, parsearDirecciones } from '../../data/import/direcciones'
import {
  leerCsvExplorador,
  unirLecturas,
  type LecturaExplorador,
} from '../../data/import/explorador'
import { leerCsvExchange, type PlantillaExchange } from '../../data/import/exchange'
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
  exchange: 'movimientos de exchange',
}

const PLANTILLAS_EXCHANGE: { valor: PlantillaExchange; titulo: string; ayuda: string }[] = [
  { valor: 'auto', titulo: 'Automático', ayuda: 'Detecta el formato por cabecera.' },
  { valor: 'binance', titulo: 'Binance', ayuda: 'Formato de trades y comisiones de Binance.' },
  { valor: 'coinbase', titulo: 'Coinbase', ayuda: 'Formato de trades y tipos de Coinbase.' },
  { valor: 'kraken', titulo: 'Kraken', ayuda: 'Formato típico de CSV de Kraken.' },
  { valor: 'cointracking', titulo: 'CoinTracking', ayuda: 'Forzar parsing de CSV con campos CoinTracking.' },
  { valor: 'generic', titulo: 'Genérico', ayuda: 'Último recurso para ficheros no estándar.' },
]

export function ImportarPage() {
  const ubicaciones = useLiveQuery(listarUbicaciones, [])
  const activos = useLiveQuery(listarActivos, [])
  const [ficheros, setFicheros] = useState<FicheroLeido[]>([])
  const [candidatos, setCandidatos] = useState<CandidatoApunte[]>([])
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<string | null>(null)
  const [modo, setModo] = useState<'cadena' | 'exchange'>('cadena')
  const [plantillaExchange, setPlantillaExchange] = useState<PlantillaExchange>('auto')
  const [nombreUbicacionNueva, setNombreUbicacionNueva] = useState('')
  const [tipoUbicacionNueva, setTipoUbicacionNueva] = useState<TipoUbicacion>('exchange')
  const [kycUbicacionNueva, setKycUbicacionNueva] = useState(false)
  const [fechaAltaUbicacionNueva, setFechaAltaUbicacionNueva] = useState('')
  const [fechaCierreUbicacionNueva, setFechaCierreUbicacionNueva] = useState('')
  const [paisUbicacionNueva, setPaisUbicacionNueva] = useState('')
  const [extranjeroUbicacionNueva, setExtranjeroUbicacionNueva] = useState(false)
  const [autocustodiaUbicacionNueva, setAutocustodiaUbicacionNueva] = useState(false)
  const [viaEvidenciaUbicacionNueva, setViaEvidenciaUbicacionNueva] = useState('')
  const [notasEvidenciaUbicacionNueva, setNotasEvidenciaUbicacionNueva] = useState('')
  const [notasUbicacionNueva, setNotasUbicacionNueva] = useState('')
  const [direccionesParaNuevaUbicacion, setDireccionesParaNuevaUbicacion] = useState('')
  const [direccionParaUbicacionExistente, setDireccionParaUbicacionExistente] = useState('')
  const [ubicacionDestinoExistente, setUbicacionDestinoExistente] = useState('')

  const listaUbic = ubicaciones.datos ?? []
  const indice = useMemo(() => indexarDirecciones(listaUbic), [listaUbic])
  const conDirecciones = listaUbic.filter((u) => (u.direcciones?.length ?? 0) > 0)
  const direccionesSinUbicacion = useMemo(() => {
    if (ficheros.length === 0) return [] as string[]

    const conteo = new Map<string, number>()
    const contar = (raw: string) => {
      const normalizada = normalizarDireccion(raw)
      if (normalizada === '') return
      if (indice.has(normalizada)) return
      conteo.set(normalizada, (conteo.get(normalizada) ?? 0) + 1)
    }

    for (const fichero of ficheros) {
      for (const movimiento of fichero.lectura.movimientos) {
        contar(movimiento.desde)
        contar(movimiento.hacia)
      }
    }

    return [...conteo.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([direccion]) => direccion)
  }, [ficheros, indice])

  useEffect(() => {
    if (ficheros.length === 0) {
      setDireccionesParaNuevaUbicacion('')
      setDireccionParaUbicacionExistente('')
      setUbicacionDestinoExistente('')
      return
    }

    if (direccionesSinUbicacion.length > 0 && direccionesParaNuevaUbicacion === '') {
      setDireccionesParaNuevaUbicacion(direccionesSinUbicacion.join('\n'))
    }
    if (direccionesSinUbicacion.length > 0 && direccionParaUbicacionExistente === '') {
      setDireccionParaUbicacionExistente(direccionesSinUbicacion.join('\n'))
    }
    const primeraUbicacion = listaUbic[0]
    if (primeraUbicacion && ubicacionDestinoExistente === '') {
      setUbicacionDestinoExistente(primeraUbicacion.id)
    }
  }, [
    direccionesSinUbicacion,
    ficheros.length,
    listaUbic,
    direccionesParaNuevaUbicacion,
    direccionParaUbicacionExistente,
    ubicacionDestinoExistente,
  ])

  /** Lee un CSV y recalcula la bandeja con TODOS los ficheros cargados. */
  const cargar = async (file: File) => {
    setError(null)
    setResultado(null)
    try {
      const texto = await leerArchivoTexto(file)
      let lectura: LecturaExplorador
      if (modo === 'exchange') {
        lectura = leerCsvExchange(texto, file.name, plantillaExchange)
      } else {
        try {
          lectura = leerCsvExplorador(texto, file.name)
        } catch (eCadena) {
          const mensajeCadena = eCadena instanceof Error ? eCadena.message : String(eCadena)
            try {
            lectura = leerCsvExchange(texto, file.name, plantillaExchange)
            setModo('exchange')
            setResultado(`Fichero detectado como exportación de exchange; se está procesando como "Exchange".`)
          } catch (eExchange) {
            const mensajeExchange = eExchange instanceof Error ? eExchange.message : String(eExchange)
            setError(`${mensajeCadena}\n${mensajeExchange}`)
            return
          }
        }
      }
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
    setDireccionesParaNuevaUbicacion('')
    setDireccionParaUbicacionExistente('')
    setError(null)
    setResultado(null)
  }

  const fechaAltaLocal = () => {
    const ahora = new Date()
    const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000)
    return local.toISOString().slice(0, 19)
  }

  const deduplicarDirecciones = (direcciones: readonly string[]) => {
    const vistas = new Set<string>()
    const salida: string[] = []
    for (const direccion of direcciones) {
      const normalizada = normalizarDireccion(direccion)
      if (normalizada === '' || vistas.has(normalizada)) continue
      vistas.add(normalizada)
      salida.push(normalizada)
    }
    return salida
  }

  const crearUbicacionRapida = async () => {
    const nombre = nombreUbicacionNueva.trim()
    const direccionesDetectadas = deduplicarDirecciones(parsearDirecciones(direccionesParaNuevaUbicacion))
    const direcciones = direccionesDetectadas.filter((direccion) => !indice.has(direccion))
    const fechaAlta = fechaAltaUbicacionNueva.trim() || fechaAltaLocal()
    const nota = notasUbicacionNueva.trim()
    const viaEvidencia = viaEvidenciaUbicacionNueva.trim()
    const notasEvidencia = notasEvidenciaUbicacionNueva.trim()
    const fechaCierre = fechaCierreUbicacionNueva.trim()

    if (nombre === '') {
      setError('Dale un nombre a la ubicación para guardarla.')
      return
    }

    await crearUbicacion({
      nombre,
      tipo: tipoUbicacionNueva,
      kyc: kycUbicacionNueva,
      fechaAlta,
      ...(fechaCierre ? { fechaCierre } : {}),
      ...(paisUbicacionNueva.trim() ? { pais: paisUbicacionNueva.trim() } : {}),
      extranjero: extranjeroUbicacionNueva,
      autocustodia: autocustodiaUbicacionNueva,
      ...(viaEvidencia ? { viaEvidencia } : {}),
      ...(notasEvidencia ? { notasEvidencia } : {}),
      ...(nota ? { notas: nota } : {}),
      direcciones,
    })

    const mensajeAdicional = direccionesDetectadas.length === 0
      ? 'No se añadieron direcciones nuevas; quedó lista para clasificar movimientos tras crearla manualmente.'
      : `Ubicación ${nombre} creada con ${direcciones.length} dirección(es).`
    setResultado(
      direccionesDetectadas.length > 0 && direcciones.length === 0
        ? `Ubicación ${nombre} creada. ${mensajeAdicional}`
        : `Ubicación ${nombre} creada ${direccionesDetectadas.length > 0 ? `con ${direcciones.length} dirección(es) nuevas` : ''}.`,
    )
    setNombreUbicacionNueva('')
    setKycUbicacionNueva(false)
    setTipoUbicacionNueva('exchange')
    setFechaAltaUbicacionNueva('')
    setFechaCierreUbicacionNueva('')
    setPaisUbicacionNueva('')
    setExtranjeroUbicacionNueva(false)
    setAutocustodiaUbicacionNueva(false)
    setViaEvidenciaUbicacionNueva('')
    setNotasEvidenciaUbicacionNueva('')
    setNotasUbicacionNueva('')
    setDireccionesParaNuevaUbicacion('')
    const { movimientos } = unirLecturas(ficheros.map((f) => f.lectura))
    const indiceTemporal = new Map(indice)
    for (const direccion of direcciones) {
      indiceTemporal.set(direccion, 'nueva-ubicacion')
    }
    setCandidatos(proponerCandidatos(movimientos, indiceTemporal))
  }

  const asignarDireccionesExistente = async () => {
    const destino = listaUbic.find((u) => u.id === ubicacionDestinoExistente)
    if (!destino) {
      setError('Selecciona una ubicación válida para asignar direcciones.')
      return
    }

    const candidatas = deduplicarDirecciones(parsearDirecciones(direccionParaUbicacionExistente))
    const nuevas = candidatas.filter((direccion) => !indice.has(direccion))

    const direccionesActuales = deduplicarDirecciones(destino.direcciones ?? [])
    const direccionNuevas = nuevas.filter((direccion) => !direccionesActuales.includes(direccion))

    if (direccionNuevas.length === 0) {
      setError('No hay direcciones nuevas que añadir a esa ubicación.')
      return
    }

    await actualizarUbicacion(destino.id, {
      direcciones: [...direccionesActuales, ...direccionNuevas],
    })

    setResultado(`Añadidas ${direccionNuevas.length} direcciones a ${destino.nombre}.`)
    setDireccionParaUbicacionExistente(direccionesSinUbicacion.join('\n'))
    const { movimientos } = unirLecturas(ficheros.map((f) => f.lectura))
    const indiceTemporal = new Map(indice)
    for (const direccion of direccionNuevas) {
      indiceTemporal.set(direccion, destino.id)
    }
    setCandidatos(proponerCandidatos(movimientos, indiceTemporal))
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
        sobretitulo="Importar desde origen externo"
        titulo="Importar datos"
        subtitulo={
          <>
            La app <strong>no consulta ninguna fuente externa</strong>: sube solo tus CSV locales y
            confirma tú cada movimiento antes de pasarlo al Diario. Elige <strong>Cadena</strong> o{' '}
            <strong>Exchange</strong> según el CSV.
          </>
        }
      />

      {error && (
        <Banner tono="error" onCerrar={() => setError(null)}>
          {error.split('\n').map((linea) => (
            <div key={linea}>{linea}</div>
          ))}
        </Banner>
      )}
      {resultado && <Banner tono="exito" onCerrar={() => setResultado(null)}>{resultado}</Banner>}

      {conDirecciones.length === 0 && (
        <Banner tono="info">
          Ninguna de tus ubicaciones tiene direcciones registradas. Sin ellas no puedo saber qué
          movimientos son traslados tuyos: todo quedará por calificar. Añade ubicaciones manualmente
          abajo para clasificar este CSV.
        </Banner>
      )}

      {/* ── 1 · Ficheros ──────────────────────────────────────────────── */}
      <div className="rounded-panel border border-borde bg-superficie-elevada p-3">
        <p className="mb-2 text-cuerpo font-semibold text-texto">Importar como</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={modo === 'cadena' ? BTN_PRIMARIO : BTN_SECUNDARIO}
            onClick={() => {
              setModo('cadena')
              setFicheros([])
              setCandidatos([])
              setError(null)
              setResultado(null)
            }}
          >
            Cadena / Explorador
          </button>
          <button
            type="button"
            className={modo === 'exchange' ? BTN_PRIMARIO : BTN_SECUNDARIO}
            onClick={() => {
              setModo('exchange')
              setPlantillaExchange('auto')
              setFicheros([])
              setCandidatos([])
              setError(null)
              setResultado(null)
            }}
          >
            Exchange
          </button>
        </div>
      </div>

      <Card
        titulo="1 · Sube el CSV"
        subtitulo={
          <>
            {modo === 'cadena' ? (
              <>
                De cada cadena hacen falta <strong>hasta tres exportaciones</strong>: transacciones
                normales (solo el activo nativo), tokens ERC-20 y transacciones internas.
                Súbelas todas: la app las une y deduplica por transacción.
              </>
            ) : (
              <>
                Sube el CSV exportado por tu exchange (binance, kraken, bybit, etc.). El sistema
                propone una sugerencia de tipo, pero tú decides el tipo fiscal final.
              </>
            )}
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
          {modo === 'exchange' && (
            <label className="text-cuerpo">
              Plantilla:
              <select
                className={`${INPUT_SISTEMA} ml-2`}
                value={plantillaExchange}
                onChange={(e) => setPlantillaExchange(e.target.value as PlantillaExchange)}
              >
                {PLANTILLAS_EXCHANGE.map((p) => (
                  <option key={p.valor} value={p.valor}>
                    {p.titulo}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {modo === 'exchange' && plantillaExchange !== 'auto' && (
          <p className="mt-2 text-caption text-texto-mudo">
            {PLANTILLAS_EXCHANGE.find((p) => p.valor === plantillaExchange)?.ayuda}
          </p>
        )}
        {ficheros.length > 0 && (
          <>
            <div className="mt-3 flex gap-2">
              <button type="button" className={BTN_SECUNDARIO} onClick={reproponer}>
                Volver a proponer
              </button>
              <button type="button" className={BTN_SECUNDARIO} onClick={limpiar}>
                Vaciar bandeja
              </button>
            </div>
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
          </>
        )}
      </Card>

        <Card
          titulo="2 · Ubicaciones detectadas"
          subtitulo="Añade una ubicación nueva o conecta direcciones para mejorar la propuesta."
        >
        <div className="space-y-3">
          <div className="rounded-panel border border-borde bg-superficie p-3">
            <p className="mb-2 text-cuerpo font-semibold">Alta manual de ubicación</p>
            <p className="mb-3 text-cuerpo text-texto-secundario">
              También puedes crear la ubicación sin direcciones y completar después la evidencia o los
              datos de custodia.
            </p>
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-cuerpo">
                  Tipo
                  <select
                    className={`${INPUT_SISTEMA} mt-1`}
                    value={tipoUbicacionNueva}
                    onChange={(e) => setTipoUbicacionNueva(e.target.value as TipoUbicacion)}
                  >
                    <option value="exchange">exchange</option>
                    <option value="wallet">wallet</option>
                    <option value="canal">canal</option>
                  </select>
                </label>
                <label className="text-cuerpo">
                  Nombre
                  <input
                    className={`${INPUT_SISTEMA} mt-1`}
                    value={nombreUbicacionNueva}
                    placeholder="p. ej. Binance"
                    onChange={(e) => setNombreUbicacionNueva(e.target.value)}
                  />
                </label>
                <label className="text-cuerpo">
                  Fecha alta
                  <input
                    type="datetime-local"
                    className={`${INPUT_SISTEMA} mt-1`}
                    value={fechaAltaUbicacionNueva}
                    onChange={(e) => setFechaAltaUbicacionNueva(e.target.value)}
                  />
                </label>
                <label className="text-cuerpo">
                  Fecha cierre
                  <input
                    type="datetime-local"
                    className={`${INPUT_SISTEMA} mt-1`}
                    value={fechaCierreUbicacionNueva}
                    onChange={(e) => setFechaCierreUbicacionNueva(e.target.value)}
                  />
                </label>
                <label className="text-cuerpo">
                  País (opcional)
                  <input
                    className={`${INPUT_SISTEMA} mt-1`}
                    value={paisUbicacionNueva}
                    placeholder="España, Alemania…"
                    onChange={(e) => setPaisUbicacionNueva(e.target.value)}
                  />
                </label>
                <label className="text-cuerpo">
                  Vía evidencia
                  <input
                    className={`${INPUT_SISTEMA} mt-1`}
                    value={viaEvidenciaUbicacionNueva}
                    placeholder="KYC, extracto bancario, etc."
                    onChange={(e) => setViaEvidenciaUbicacionNueva(e.target.value)}
                  />
                </label>
                <label className="text-cuerpo">
                  Notas
                  <input
                    className={`${INPUT_SISTEMA} mt-1`}
                    value={notasUbicacionNueva}
                    onChange={(e) => setNotasUbicacionNueva(e.target.value)}
                  />
                </label>
              </div>
              <label className="text-cuerpo">
                Notas de evidencia
                <textarea
                  className={`${INPUT_SISTEMA} mt-1 min-h-20 w-full`}
                  value={notasEvidenciaUbicacionNueva}
                  onChange={(e) => setNotasEvidenciaUbicacionNueva(e.target.value)}
                />
              </label>
              <label className="text-cuerpo">
                Direcciones (una por línea)
                <textarea
                  className={`${INPUT_SISTEMA} mt-1 min-h-20 w-full`}
                  value={direccionesParaNuevaUbicacion}
                  onChange={(e) => setDireccionesParaNuevaUbicacion(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-cuerpo flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={kycUbicacionNueva}
                    onChange={(e) => setKycUbicacionNueva(e.target.checked)}
                  />
                  KYC
                </label>
                <label className="text-cuerpo flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={extranjeroUbicacionNueva}
                    onChange={(e) => setExtranjeroUbicacionNueva(e.target.checked)}
                  />
                  Extranjera
                </label>
                <label className="text-cuerpo flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autocustodiaUbicacionNueva}
                    onChange={(e) => setAutocustodiaUbicacionNueva(e.target.checked)}
                  />
                  Autocustodia
                </label>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <button type="button" className={BTN_PRIMARIO} onClick={crearUbicacionRapida}>
                Guardar ubicación
              </button>
              <button
                type="button"
                className={BTN_SECUNDARIO}
                onClick={() => {
                  setNombreUbicacionNueva('')
                  setTipoUbicacionNueva('exchange')
                  setKycUbicacionNueva(false)
                  setFechaAltaUbicacionNueva('')
                  setFechaCierreUbicacionNueva('')
                  setPaisUbicacionNueva('')
                  setExtranjeroUbicacionNueva(false)
                  setAutocustodiaUbicacionNueva(false)
                  setViaEvidenciaUbicacionNueva('')
                  setNotasEvidenciaUbicacionNueva('')
                  setNotasUbicacionNueva('')
                  setDireccionesParaNuevaUbicacion(ficheros.length > 0 ? direccionesSinUbicacion.join('\n') : '')
                }}
              >
                Reiniciar
              </button>
              <button
                type="button"
                className={BTN_SECUNDARIO}
                onClick={() => setDireccionesParaNuevaUbicacion(direccionesSinUbicacion.join('\n'))}
              >
                Cargar direcciones detectadas
              </button>
            </div>
          </div>

          {ficheros.length > 0 && (
            <div className="rounded-panel border border-borde bg-superficie p-3">
              <p className="mb-2 text-cuerpo font-semibold">Asignar a ubicación existente</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  className={INPUT_SISTEMA}
                  value={ubicacionDestinoExistente}
                  onChange={(e) => setUbicacionDestinoExistente(e.target.value)}
                >
                  <option value="">Selecciona ubicación</option>
                  {listaUbic.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre}
                    </option>
                  ))}
                </select>
                <button type="button" className={BTN_SECUNDARIO} onClick={asignarDireccionesExistente}>
                  Asignar direcciones
                </button>
              </div>
              <textarea
                className={`${INPUT_SISTEMA} mt-2 min-h-20 w-full`}
                value={direccionParaUbicacionExistente}
                onChange={(e) => setDireccionParaUbicacionExistente(e.target.value)}
              />
            </div>
          )}
          {ficheros.length > 0 && direccionesSinUbicacion.length > 0 && (
            <div className="rounded-panel border border-borde bg-superficie p-3">
              <p className="mb-2 text-cuerpo font-semibold">Resumen de direcciones pendientes</p>
              <p className="text-cuerpo text-texto-secundario mb-2">
                Se han detectado {direccionesSinUbicacion.length} direcciones no asignadas durante esta
                importación.
              </p>
            </div>
          )}
        </div>
        {ficheros.length > 0 && (
          <p className="text-cuerpo text-texto-secundario">
            {direccionesSinUbicacion.length === 0
              ? 'Todas las direcciones detectadas ya están asignadas a una ubicación.'
              : 'Revisa las direcciones de la importación para darlas de alta o reutilizarlas.'}
          </p>
        )}
        </Card>

      {/* ── 3 · Bandeja de triaje ─────────────────────────────────────── */}
      {candidatos.length > 0 && (
        <Card
          titulo="3 · Confirma cada movimiento"
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
