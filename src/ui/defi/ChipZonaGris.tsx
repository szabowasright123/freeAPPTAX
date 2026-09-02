/**
 * ChipZonaGris.tsx — distintivo visual de los apuntes sin criterio administrativo publicado.
 *
 * Existe porque la zona gris no debe pasar desapercibida (DEFI §9). Un apunte de wrapping y
 * uno de venta se ven igual en la tabla, pero el primero descansa sobre una tesis fundada y
 * no confirmada. Que se distingan de un vistazo es lo que separa un Libro que documenta su
 * criterio de otro que da todo por resuelto.
 *
 * Dos estados: con criterio escrito (ámbar, informativo) y sin él (rojo, hay que completarlo,
 * porque sin constancia del criterio la posición no se defiende ante una comprobación).
 * Desde D6 es el `Chip` del sistema en los tonos revisar/error del semáforo.
 */
import { ETIQUETA_EVENTO, esZonaGris, type Apunte } from '../../engine/types'
import { Chip } from '../comp'

export function ChipZonaGris({ apunte }: { apunte: Pick<Apunte, 'evento' | 'criterioAplicado'> }) {
  if (!esZonaGris(apunte.evento)) return null

  const conCriterio = !!apunte.criterioAplicado?.trim()
  const titulo = conCriterio
    ? `${ETIQUETA_EVENTO[apunte.evento!]} — sin criterio administrativo publicado.\n\n` +
      `Criterio aplicado: ${apunte.criterioAplicado}`
    : `${ETIQUETA_EVENTO[apunte.evento!]} — sin criterio administrativo publicado y SIN ` +
      'constancia del criterio aplicado. Complétalo: sin esa nota la posición no es ' +
      'defendible (art. 33.5.a LIRPF).'

  return (
    <Chip tono={conCriterio ? 'revisar' : 'error'} titulo={titulo}>
      <span className="uppercase tracking-wide">{conCriterio ? 'zona gris' : 'sin criterio'}</span>
    </Chip>
  )
}
