import { useEffect, useRef, useState } from 'react'
import {
  borrarTodo,
  estadoCopia,
  registrarCopiaRealizada,
  restaurarSnapshot,
  snapshotActual,
} from '../../data/repositorio'
import { estadoAlmacenamientoPersistente } from '../../data/db'
import { ErrorRestauracion, exportarJson, parsearSnapshot } from '../../data/import/json-backup'
import { useLiveQuery } from '../../data/useLiveQuery'
import { descargarTexto, leerArchivoTexto } from '../descargas'
import { fmtFecha } from '../formato'
import {
  Banner,
  BTN_PELIGRO_SISTEMA,
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  Card,
  PageHeader,
} from '../comp'
import { SelectorTema } from '../tema-ui'

type Aviso = { tono: 'info' | 'exito' | 'error'; texto: string }

export function AjustesPage() {
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [persistente, setPersistente] = useState<boolean | null>(null)
  const archivo = useRef<HTMLInputElement>(null)
  const copia = useLiveQuery(estadoCopia, [])
  const marca = copia.estado === 'listo' ? copia.datos : {}

  useEffect(() => {
    let activo = true
    void estadoAlmacenamientoPersistente().then((valor) => activo && setPersistente(valor))
    return () => {
      activo = false
    }
  }, [])

  async function ejecutar(accion: () => Promise<void>) {
    if (ocupado) return
    setAviso(null)
    setOcupado(true)
    try {
      await accion()
    } catch (error) {
      setAviso({ tono: 'error', texto: error instanceof Error ? error.message : String(error) })
    } finally {
      setOcupado(false)
    }
  }

  const descargar = () =>
    ejecutar(async () => {
      const snapshot = await snapshotActual()
      const direcciones = snapshot.ubicaciones.reduce(
        (total, ubicacion) => total + (ubicacion.direcciones?.length ?? 0),
        0,
      )
      if (
        direcciones > 0 &&
        !window.confirm(
          `La copia incluye ${direcciones} dirección(es) on-chain. Guárdala como guardarías un extracto bancario. ¿Descargar?`,
        )
      )
        return

      const ahora = new Date().toISOString()
      descargarTexto(
        `libro-hesperides-copia-${ahora.slice(0, 10)}.json`,
        exportarJson({ ...snapshot, exportadoEn: ahora }),
      )
      await registrarCopiaRealizada(ahora, snapshot.apuntes.length)
      setAviso({ tono: 'exito', texto: 'Copia de seguridad descargada.' })
    })

  const restaurar = (fichero: File) =>
    ejecutar(async () => {
      let snapshot
      try {
        snapshot = parsearSnapshot(await leerArchivoTexto(fichero))
      } catch (error) {
        throw error instanceof ErrorRestauracion
          ? error
          : new Error('No se pudo leer la copia seleccionada.')
      }
      if (!window.confirm('Restaurar sustituirá por completo los datos actuales. ¿Continuar?')) return
      await restaurarSnapshot(snapshot)
      setAviso({ tono: 'exito', texto: `Copia restaurada: ${snapshot.apuntes.length} apuntes.` })
    })

  const borrar = () =>
    ejecutar(async () => {
      if (!window.confirm('Se eliminarán todos los datos guardados en este navegador. ¿Continuar?')) return
      if (window.prompt('Escribe BORRAR para confirmar:')?.trim().toUpperCase() !== 'BORRAR') {
        setAviso({ tono: 'info', texto: 'Borrado cancelado.' })
        return
      }
      await borrarTodo()
      setAviso({ tono: 'exito', texto: 'El libro se ha vaciado.' })
    })

  return (
    <div className="space-y-8">
      <PageHeader
        titulo="Ajustes"
        subtitulo="Gestiona la apariencia y protege los datos que permanecen en este navegador."
      />

      {aviso && (
        <Banner tono={aviso.tono} onCerrar={() => setAviso(null)}>
          {aviso.texto}
        </Banner>
      )}

      <Card titulo="Apariencia" subtitulo="Elige cómo quieres ver la aplicación.">
        <SelectorTema />
      </Card>

      <Card
        titulo="Copia de seguridad"
        subtitulo="Descarga o restaura una copia completa y privada de tu libro y archivo."
      >
        <div className="flex flex-wrap gap-2">
          <button type="button" className={BTN_PRIMARIO} onClick={descargar} disabled={ocupado}>
            Descargar copia
          </button>
          <button
            type="button"
            className={BTN_SECUNDARIO}
            onClick={() => archivo.current?.click()}
            disabled={ocupado}
          >
            Restaurar copia…
          </button>
          <input
            ref={archivo}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(evento) => {
              const fichero = evento.target.files?.[0]
              evento.target.value = ''
              if (fichero) void restaurar(fichero)
            }}
          />
        </div>
        <div className="mt-3 space-y-1 text-apoyo text-texto-secundario">
          <p>
            {marca.ultimaCopiaEn
              ? `Última copia: ${fmtFecha(marca.ultimaCopiaEn)}.`
              : 'Todavía no has descargado una copia desde este navegador.'}
          </p>
          <p>
            Almacenamiento persistente:{' '}
            {persistente === true ? 'protegido' : persistente === false ? 'sin proteger' : 'no consta'}.
          </p>
        </div>
      </Card>

      <Card
        titulo="Zona peligrosa"
        subtitulo="El borrado afecta solamente a los datos guardados por esta app en este navegador."
      >
        <button type="button" className={BTN_PELIGRO_SISTEMA} onClick={borrar} disabled={ocupado}>
          Borrar todo…
        </button>
      </Card>
    </div>
  )
}
