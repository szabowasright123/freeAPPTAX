import { useEffect, useMemo, useState } from 'react'
import { abrirBaseDatos, db, estadoAlmacenamientoPersistente } from '../../data/db'
import { useLiveQuery } from '../../data/useLiveQuery'
import { estadoCopia } from '../../data/repositorio'
import { necesitaRecordatorioCopia, textoRecordatorio } from '../../data/copias'
import { Banner, BTN_PRIMARIO, BTN_SECUNDARIO, Card, Chip, EmptyState, Stat } from '../comp'
import { irA } from '../shell/rutas'
import { PanelInstalacion } from '../../pwa/PanelInstalacion'

type EstadoDB =
  | { fase: 'abriendo' }
  | { fase: 'ok'; version: number }
  | { fase: 'error'; mensaje: string }

interface Conteos {
  apuntes: number
  justificantes: number
}

export function HomePage() {
  const [estado, setEstado] = useState<EstadoDB>({ fase: 'abriendo' })
  const [persistente, setPersistente] = useState<boolean | null>(null)
  const [copiaDescartada, setCopiaDescartada] = useState(false)

  useEffect(() => {
    let activo = true
    abrirBaseDatos()
      .then((info) => activo && setEstado({ fase: 'ok', version: info.version }))
      .catch((error: unknown) =>
        activo &&
        setEstado({
          fase: 'error',
          mensaje: error instanceof Error ? error.message : String(error),
        }),
      )
    void estadoAlmacenamientoPersistente().then((valor) => activo && setPersistente(valor))
    return () => {
      activo = false
    }
  }, [])

  const listo = estado.fase === 'ok'
  const conteos = useLiveQuery(
    async (): Promise<Conteos | null> =>
      listo
        ? {
            apuntes: await db.apuntes.count(),
            justificantes: await db.justificantes.count(),
          }
        : null,
    [listo],
  )
  const datos = conteos.estado === 'listo' ? conteos.datos : null

  const copia = useLiveQuery(async () => (listo ? estadoCopia() : null), [listo])
  const recordatorio = useMemo(() => {
    if (!datos || datos.apuntes === 0 || copia.estado !== 'listo' || copia.datos === null) return null
    const resultado = necesitaRecordatorioCopia(copia.datos, datos.apuntes, new Date().toISOString())
    return resultado.necesita ? resultado : null
  }, [datos, copia])

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section className="space-y-4">
        <p className="font-mono text-caption uppercase tracking-widest text-texto-mudo">
          Gratuita · privada · local
        </p>
        <h1 className="max-w-lectura text-display font-semibold tracking-tight text-texto">
          Tu libro y tus justificantes, bajo tu control
        </h1>
        <p className="max-w-lectura text-lectura text-texto-secundario">
          Registra tus operaciones, conserva las pruebas y consulta el valor y la composición
          de tu cartera. No necesitas una cuenta: los datos permanecen en este navegador y
          puedes llevarte una copia cuando quieras.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={BTN_PRIMARIO} onClick={() => irA('diario')}>
            Abrir mi libro
          </button>
          <button type="button" className={BTN_SECUNDARIO} onClick={() => irA('archivo')}>
            Abrir mi archivo
          </button>
        </div>
      </section>

      {recordatorio && !copiaDescartada && (
        <Banner tono="info" onCerrar={() => setCopiaDescartada(true)}>
          <span>
            {textoRecordatorio(recordatorio)} Descarga una copia desde{' '}
            <button
              type="button"
              onClick={() => irA('ajustes')}
              className="font-semibold underline underline-offset-2"
            >
              Ajustes
            </button>
            .
          </span>
        </Banner>
      )}

      <PanelInstalacion />

      <Card aria-live="polite">
        {datos && datos.apuntes + datos.justificantes > 0 ? (
          <dl className="grid grid-cols-2 gap-4">
            <Stat etiqueta="apuntes" valor={datos.apuntes} />
            <Stat etiqueta="justificantes" valor={datos.justificantes} />
          </dl>
        ) : (
          <EmptyState
            icono="₿"
            titulo="Tu espacio está preparado"
            descripcion="Empieza en el Libro y añade los justificantes de cada operación al Archivo."
          />
        )}
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Secciones principales">
        <Card
          onClick={() => irA('diario')}
          titulo="Libro →"
          subtitulo="Registra y consulta tus operaciones en orden cronológico."
          className="lg:col-span-2"
        />
        <Card
          onClick={() => irA('archivo')}
          titulo="Archivo →"
          subtitulo="Conserva facturas, extractos y pruebas vinculadas a cada apunte."
          className="lg:col-span-2"
        />
        <Card
          onClick={() => irA('cartera')}
          titulo="Cartera →"
          subtitulo="Visualiza saldos, distribución, coste FIFO y evolución patrimonial."
          tono="acento"
          className="sm:col-span-2 lg:col-span-1"
        />
      </section>

      <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-borde pt-3 text-apoyo">
        <div className="flex items-center gap-2">
          <dt className="text-texto-mudo">Base local</dt>
          <dd>
            {estado.fase === 'abriendo' && <Chip>abriendo…</Chip>}
            {estado.fase === 'ok' && <Chip tono="ok">● abierta · v{estado.version}</Chip>}
            {estado.fase === 'error' && <Chip tono="error">● error: {estado.mensaje}</Chip>}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="text-texto-mudo">Almacenamiento</dt>
          <dd>
            {persistente === true && <Chip tono="ok">● protegido</Chip>}
            {persistente === false && <Chip tono="revisar">● sin proteger</Chip>}
            {persistente === null && <Chip>no consta</Chip>}
          </dd>
        </div>
      </dl>
    </div>
  )
}
