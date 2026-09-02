/**
 * InformeCadena.tsx — vista en pantalla del informe «¿cómo demuestro este saldo?».
 *
 * Renderiza la `CadenaProbatoria` (motor) como una lista de ramas (parcelas) con su cadena
 * de eslabones hacia atrás; cada eslabón muestra su papel, estado probatorio, justificantes
 * y huecos. La versión imprimible/exportable la genera `informeHtml.ts` (aparte, como en
 * D5). Presentación pura, con los Chip y tokens del sistema desde D6.
 */
import type {
  CadenaProbatoria,
  EslabonProbatorio,
  RamaProbatoria,
} from '../../engine/trazabilidad'
import type { RefUbicacion } from '../../engine/types'
import { ETIQUETA_TIPO } from '../../engine/types'
import { fmtDecimal, fmtFecha } from '../formato'
import { BadgeEstadoProbatorio } from '../archivo/EstadoProbatorio'
import { Banner, Chip } from '../comp'
import { SelloOrigen } from './SelloKyc'

const PAPEL: Record<EslabonProbatorio['papel'], string> = {
  adquisicion: 'Adquisición',
  transferencia: 'Transferencia',
  otro: 'Movimiento',
}

/** Un eslabón de la cadena: un apunte con su prueba (o su hueco). */
function Eslabon({
  eslabon,
  nombreUbic,
}: {
  eslabon: EslabonProbatorio
  nombreUbic: (r: RefUbicacion) => string
}) {
  if (eslabon.huerfano || !eslabon.apunte) {
    return (
      <li className="border-l-2 border-red-400 pl-3">
        <div className="flex items-center gap-2 text-cuerpo text-texto">
          <Chip tono="error">Eslabón roto</Chip>
          <span className="font-mono text-apoyo text-texto-mudo">{eslabon.apunteId}</span>
          <span className="text-apoyo text-texto-secundario">el apunte ya no existe en el diario</span>
        </div>
      </li>
    )
  }
  const ap = eslabon.apunte
  return (
    <li className="border-l-2 border-borde pl-3">
      <div className="flex flex-wrap items-center gap-2 text-cuerpo text-texto">
        <Chip>{PAPEL[eslabon.papel]}</Chip>
        <span className="font-mono text-apoyo text-texto-mudo">{ap.id}</span>
        <span className="font-medium">{ETIQUETA_TIPO[ap.tipo]}</span>
        <span className="text-apoyo text-texto-secundario">{fmtFecha(ap.fechaHora)}</span>
        <span className="text-apoyo text-texto-secundario">
          {nombreUbic(ap.ubicacionOrigen)} → {nombreUbic(ap.ubicacionDestino)}
        </span>
        <BadgeEstadoProbatorio estado={eslabon.estado} />
      </div>

      {eslabon.justificantes.length > 0 && (
        <ul className="mt-1 space-y-0.5 pl-1 text-apoyo text-texto-secundario">
          {eslabon.justificantes.map((j) => (
            <li key={j.id}>
              📎 <strong>{j.tipoDocumento}</strong>{' '}
              {j.fichero
                ? '(fichero adjunto)'
                : j.referenciaExterna
                  ? `(ref.: ${j.referenciaExterna})`
                  : '(sin fichero ni referencia)'}
            </li>
          ))}
        </ul>
      )}

      {eslabon.faltantes.length > 0 && (
        <div className="mt-1 text-apoyo text-semaforo-revisar dark:text-amber-400">
          <span className="font-medium">Huecos:</span>{' '}
          {eslabon.faltantes.map((f) => f.documento).join(' · ')}
        </div>
      )}
    </li>
  )
}

/** Una rama de la cadena: una parcela viva y su cadena de eslabones. */
function Rama({
  rama,
  indice,
  activo,
  nombreUbic,
}: {
  rama: RamaProbatoria
  indice: number
  activo: string
  nombreUbic: (r: RefUbicacion) => string
}) {
  return (
    <section className="rounded-panel border border-borde p-3">
      <h3 className="mb-2 flex flex-wrap items-center gap-2 text-cuerpo font-semibold text-texto">
        Parcela {indice + 1} · <span className="tabular-nums">{fmtDecimal(rama.cantidad)} {activo}</span>
        <SelloOrigen origen={rama.origen} />
        {rama.eslabonesConHueco > 0 && (
          <Chip tono="error">{rama.eslabonesConHueco} hueco(s)</Chip>
        )}
      </h3>
      <ol className="space-y-2">
        {rama.eslabones.map((e, i) => (
          <Eslabon key={`${e.apunteId}-${i}`} eslabon={e} nombreUbic={nombreUbic} />
        ))}
      </ol>
    </section>
  )
}

/** Informe completo en pantalla: reparto KYC/no-KYC + una rama por parcela. */
export function InformeCadena({
  cadena,
  nombreUbic,
}: {
  cadena: CadenaProbatoria
  nombreUbic: (r: RefUbicacion) => string
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-cuerpo">
        <Chip>
          KYC: {fmtDecimal(cadena.kyc)} {cadena.activo}
        </Chip>
        <Chip tono="brand">
          no-KYC: {fmtDecimal(cadena.noKyc)} {cadena.activo}
        </Chip>
        <span className="text-apoyo text-texto-secundario">
          {cadena.ramas.length} parcela(s) · {cadena.huecos} hueco(s) probatorio(s)
        </span>
      </div>

      {cadena.deficit && (
        <Banner tono="error">
          ⚠ Alguna salida de esta ubicación no tuvo origen suficiente registrado (saldo negativo).
          Revisa el diario.
        </Banner>
      )}

      {cadena.ramas.length === 0 ? (
        <p className="text-cuerpo text-texto-mudo">
          Este saldo no tiene parcelas vivas (saldo cero o sin movimientos registrados).
        </p>
      ) : (
        cadena.ramas.map((r, i) => (
          <Rama key={`${r.loteApunteId}-${i}`} rama={r} indice={i} activo={cadena.activo} nombreUbic={nombreUbic} />
        ))
      )}

      {/* Nota al pie del informe. Recuadro de solo prosa: el renglón LLENA la caja (sin
          `max-w-lectura`) y el relleno es de 16/20 px, no de 12, para que el texto no vaya
          pegado al marco. Misma regla que `Banner` y la Unidad del manual; ver
          `docs/DISENO_DIAGNOSTICO.md` §7.5. */}
      <p className="rounded-panel border border-dashed border-borde px-4 py-3 text-apoyo text-texto-mudo sm:px-5">
        Documento orientativo. El reparto KYC/no-KYC sigue la convención de
        propagación del proyecto (D1), validada fiscalmente el 8-8-2026. Es el índice del expediente que
        reúne los justificantes del saldo, no una prueba por sí mismo.
      </p>
    </div>
  )
}
