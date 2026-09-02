/**
 * EstadoProbatorio.tsx — presentación del estado probatorio de un apunte.
 *
 * Distintivo (badge) con semáforo probatorio (completo / incompleto / sin justificar) y
 * un ayudante que calcula el estado de todos los apuntes a partir de los registros de la
 * base. La lógica de dominio vive en el motor (`engine/archivo`); aquí solo presentación
 * y el pegamento con la capa de datos (resolución uid → correlativo).
 *
 * Desde D6 el distintivo es el `Chip` del sistema, en los tres tonos del semáforo: el
 * estado probatorio ES un semáforo (DOMINIO §7) y viste igual en Diario y Archivo.
 */
import type { EstadoProbatorio, ResultadoProbatorio } from '../../engine/archivo'
import { estadoProbatorioApunte, mapaKyc } from '../../engine/archivo'
import { aDominio, justificantesADominio } from '../../data/repositorio'
import type { ApunteRegistro, JustificanteRegistro } from '../../data/tipos'
import type { IdApunte, Ubicacion } from '../../engine/types'
import { Chip } from '../comp'

/** Configuración visual de cada estado probatorio. */
const CONFIG: Record<EstadoProbatorio, { texto: string; icono: string; tono: 'ok' | 'revisar' | 'error' }> = {
  completo: { texto: 'Completo', icono: '✓', tono: 'ok' },
  incompleto: { texto: 'Incompleto', icono: '◐', tono: 'revisar' },
  'sin-justificar': { texto: 'Sin justificar', icono: '○', tono: 'error' },
}

/** Distintivo del estado probatorio de un apunte. */
export function BadgeEstadoProbatorio({
  estado,
  titulo,
}: {
  estado: EstadoProbatorio
  titulo?: string
}) {
  const c = CONFIG[estado]
  return (
    <Chip tono={c.tono} titulo={titulo}>
      <span aria-hidden>{c.icono}</span>
      <span className="whitespace-nowrap">{c.texto}</span>
    </Chip>
  )
}

/**
 * Calcula el estado probatorio de cada apunte, indexado por su correlativo `id`. Recibe
 * los registros de almacenamiento (apuntes y justificantes) y las ubicaciones (para el
 * KYC), y los traduce a dominio para el motor.
 */
export function mapaEstadosProbatorios(
  registrosApuntes: readonly ApunteRegistro[],
  registrosJustificantes: readonly JustificanteRegistro[],
  ubicaciones: readonly Ubicacion[],
): Map<IdApunte, ResultadoProbatorio> {
  const apuntes = aDominio([...registrosApuntes])
  const justificantes = justificantesADominio(registrosJustificantes, registrosApuntes)
  const kyc = mapaKyc(ubicaciones)

  const porApunte = new Map<IdApunte, ReturnType<typeof justificantesADominio>>()
  for (const j of justificantes) {
    const lista = porApunte.get(j.apunteId)
    if (lista) lista.push(j)
    else porApunte.set(j.apunteId, [j])
  }

  const salida = new Map<IdApunte, ResultadoProbatorio>()
  for (const ap of apuntes) {
    salida.set(ap.id, estadoProbatorioApunte(ap, porApunte.get(ap.id) ?? [], kyc))
  }
  return salida
}
