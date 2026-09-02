/**
 * FormularioApunte — alta/edición de un apunte del Libro.
 *
 * Al elegir el tipo, muestra SOLO los campos que ese tipo admite y marca los
 * obligatorios (modeloFormulario.ts). Valida EN VIVO con el motor
 * (validaciones.ts): los errores bloquean el guardado. DONACIÓN pregunta el
 * sentido; AJUSTE exige apunte rectificado + causa. Si la fecha rompe el orden
 * cronológico, avisa de que el diario se reordenará y renumerará.
 *
 * No calcula saldos/FIFO: solo captura y valida. El cálculo vive en el motor.
 */
import { useEffect, useMemo, useState } from 'react'
import type { Activo, Apunte, Ubicacion } from '../../engine/types'
import { UBICACION_EXTERIOR } from '../../engine/types'
import { validarApunte } from '../../engine/validaciones'
import type { ApunteRegistro, BorradorApunte } from '../../data/tipos'
import { crearApunte, actualizarApunte } from '../../data/repositorio'
import { rompeOrden } from '../../data/numeracion'
import {
  camposDeTipo,
  camposFaltantes,
  type CamposApunte,
  type SentidoDonacion,
} from './modeloFormulario'
import {
  SUBTIPOS_PERDIDA,
  SUBTIPOS_PERDIDA_ELEGIBLES,
  FECHA_CRITERIO_PERDIDAS,
} from './perdidaSubtipos'
import type { SubtipoPerdida } from '../../data/tipos'
import { ETIQUETA_TIPO, TIPOS_OPERACION } from '../../engine/types'
import { mapaKyc, ubicacionRelevanteConKyc } from '../../engine/archivo'
import { BTN_PRIMARIO, BTN_SECUNDARIO, INPUT_SISTEMA, Modal, Banner, Card, Field, cx } from '../comp'
import { fmtFechaHora, aDecimalDominio } from '../formato'
import {
  SeccionJustificantes,
  cargarBorradores,
  reconciliarJustificantes,
  type BorradorJustificante,
} from '../archivo/SeccionJustificantes'

/** Estado inicial de apertura del formulario. */
export interface AperturaFormulario {
  borrador: BorradorApunte
  /** uid si se está editando; ausente si es alta o duplicado. */
  uid?: string
  /** Título de la ventana (p. ej. «Editar 2024-008», «Duplicar apunte»). */
  titulo: string
}

interface Props {
  abierto: boolean
  onCerrar: () => void
  ubicaciones: Ubicacion[]
  activos: Activo[]
  /** Registros existentes (para el selector de AJUSTE y el aviso de reordenación). */
  registros: ApunteRegistro[]
  apertura: AperturaFormulario | null
  onGuardado: (mensaje: string) => void
}

/**
 * Deduce el sentido de una DONACIÓN ya registrada. Manda el campo `sentido` del apunte si
 * está; si no —Libros anteriores a la v1.6.0— se infiere de qué lado tiene, que es lo que
 * hacía esta función cuando el sentido solo vivía en la pantalla y no se guardaba.
 */
function sentidoDeBorrador(b: BorradorApunte): SentidoDonacion {
  if (b.sentido === 'entregada' || b.sentido === 'recibida') return b.sentido
  return b.activoSalida ? 'entregada' : 'recibida'
}

/**
 * Proyecta el borrador a un `Apunte` de dominio para validarlo en vivo con el motor.
 * (rectificaA se pone a un valor truthy si hay referencia: el motor solo comprueba
 * su presencia.)
 */
function aDominioValidable(b: BorradorApunte): Apunte {
  const ap: Apunte = {
    id: 'nuevo',
    fechaHora: b.fechaHora || '2000-01-01T00:00:00',
    tipo: b.tipo,
    ubicacionOrigen: b.ubicacionOrigen,
    ubicacionDestino: b.ubicacionDestino,
  }
  // Cantidades: se normalizan a decimal de dominio; si el tecleo aún no es un
  // número válido, se omite el lado (el motor no debe recibir texto a medias).
  const cs = aDecimalDominio(b.cantidadSalida)
  const ce = aDecimalDominio(b.cantidadEntrada)
  const cc = aDecimalDominio(b.comisionCantidad)
  const cv = aDecimalDominio(b.contravalorEUR)
  if (b.activoSalida) ap.activoSalida = b.activoSalida
  if (cs) ap.cantidadSalida = cs
  if (b.activoEntrada) ap.activoEntrada = b.activoEntrada
  if (ce) ap.cantidadEntrada = ce
  if (cc) ap.comisionCantidad = cc
  if (b.comisionActivo) ap.comisionActivo = b.comisionActivo
  if (cv !== undefined) ap.contravalorEUR = cv
  // Art. 37.1.h) LIRPF (solo PERMUTA): los dos valores de mercado. El motor aplica el mayor.
  const vme = aDecimalDominio(b.valorMercadoEntregadoEUR)
  const vmr = aDecimalDominio(b.valorMercadoRecibidoEUR)
  if (vme !== undefined) ap.valorMercadoEntregadoEUR = vme
  if (vmr !== undefined) ap.valorMercadoRecibidoEUR = vmr
  // Sentido de DONACIÓN / AJUSTE: el formulario ya lo preguntaba, pero hasta la v1.6.0 se
  // quedaba en la pantalla y no llegaba al apunte, de modo que el motor no movía la cola
  // FIFO. Ahora se proyecta y la validación puede exigirlo (ver engine/conciliacion.ts).
  if (b.sentido) ap.sentido = b.sentido
  if (b.notas) ap.notas = b.notas
  if (b.rectificaAUid) ap.rectificaA = b.rectificaAUid
  return ap
}

/** Limpia del borrador los lados que el tipo actual oculta, antes de guardar. */
function sanear(b: BorradorApunte, campos: CamposApunte): BorradorApunte {
  const out: BorradorApunte = { ...b }
  if (campos.entrada === 'oculto') {
    delete out.activoEntrada
    delete out.cantidadEntrada
  }
  if (campos.salida === 'oculto') {
    delete out.activoSalida
    delete out.cantidadSalida
  }
  if (campos.comision === 'oculto') {
    delete out.comisionCantidad
    delete out.comisionActivo
  }
  if (campos.contravalor === 'oculto') delete out.contravalorEUR
  // Los dos valores de mercado solo tienen sentido en la PERMUTA (art. 37.1.h LIRPF).
  if (b.tipo !== 'PERMUTA') {
    delete out.valorMercadoEntregadoEUR
    delete out.valorMercadoRecibidoEUR
  }
  if (campos.rectificaA === 'oculto') delete out.rectificaAUid
  // El subtipo solo aplica a PÉRDIDA (derivada D2): en el resto se descarta.
  if (b.tipo !== 'PERDIDA') delete out.subtipoPerdida
  // El sentido solo tiene significado donde el catálogo dice «según el caso».
  if (b.tipo !== 'DONACION' && b.tipo !== 'AJUSTE') delete out.sentido
  // Normaliza cantidades a decimal de dominio (punto interno); descarta las que no
  // sean un número válido para no persistir texto a medio teclear.
  normalizarCampo(out, 'cantidadEntrada')
  normalizarCampo(out, 'cantidadSalida')
  normalizarCampo(out, 'comisionCantidad')
  normalizarCampo(out, 'contravalorEUR')
  normalizarCampo(out, 'valorMercadoEntregadoEUR')
  normalizarCampo(out, 'valorMercadoRecibidoEUR')
  return out
}

/** Normaliza un campo numérico del borrador a decimal de dominio (o lo elimina). */
function normalizarCampo(
  b: BorradorApunte,
  campo:
    | 'cantidadEntrada'
    | 'cantidadSalida'
    | 'comisionCantidad'
    | 'contravalorEUR'
    | 'valorMercadoEntregadoEUR'
    | 'valorMercadoRecibidoEUR',
): void {
  const v = aDecimalDominio(b[campo])
  if (v === undefined) delete b[campo]
  else b[campo] = v
}

export function FormularioApunte({
  abierto,
  onCerrar,
  ubicaciones,
  activos,
  registros,
  apertura,
  onGuardado,
}: Props) {
  const [borrador, setBorrador] = useState<BorradorApunte>(() => apertura?.borrador ?? vacio())
  const [sentido, setSentido] = useState<SentidoDonacion>('entregada')
  const [error, setError] = useState<string | null>(null)
  const [justificantes, setJustificantes] = useState<BorradorJustificante[]>([])

  // Resetea el estado al (re)abrir con una apertura nueva. En edición, precarga los
  // justificantes ya guardados del apunte; en alta/duplicado, empieza vacío.
  useEffect(() => {
    if (!apertura) return
    // Un borrador de DONACIÓN o AJUSTE que llegue sin `sentido` —alta nueva, o un apunte
    // guardado antes de la v1.6.0— se abre ya con el que muestra la pantalla, para que lo
    // que el alumno ve y lo que el motor calcula no se separen ni un instante.
    const b = apertura.borrador
    const s = sentidoDeBorrador(b)
    if (b.tipo === 'DONACION' && !b.sentido) setBorrador({ ...b, sentido: s })
    else if (b.tipo === 'AJUSTE' && !b.sentido) setBorrador({ ...b, sentido: 'solo-saldos' })
    else setBorrador(b)
    setSentido(s)
    setError(null)
    if (apertura.uid) {
      cargarBorradores(apertura.uid).then(setJustificantes).catch(() => setJustificantes([]))
    } else {
      setJustificantes([])
    }
  }, [apertura])

  // ¿La ubicación relevante del apunte está sujeta a KYC? Determina qué rama de la
  // checklist probatoria se exige (adquisición KYC vs. no-KYC).
  const conKyc = useMemo(
    () =>
      ubicacionRelevanteConKyc(
        { ubicacionOrigen: borrador.ubicacionOrigen, ubicacionDestino: borrador.ubicacionDestino },
        mapaKyc(ubicaciones),
      ),
    [borrador.ubicacionOrigen, borrador.ubicacionDestino, ubicaciones],
  )

  const campos = useMemo(
    () => camposDeTipo(borrador.tipo, sentido),
    [borrador.tipo, sentido],
  )

  // Validación en vivo: errores del motor + campos obligatorios que faltan.
  const avisosMotor = useMemo(() => validarApunte(aDominioValidable(borrador)), [borrador])
  const faltan = useMemo(() => camposFaltantes(borrador, campos), [borrador, campos])
  const erroresMotor = avisosMotor.filter((a) => a.nivel === 'error')
  const avisosBlandos = avisosMotor.filter((a) => a.nivel === 'aviso')
  const puedeGuardar = borrador.fechaHora !== '' && erroresMotor.length === 0 && faltan.length === 0

  const reordenara = borrador.fechaHora !== '' && rompeOrden(registros, borrador.fechaHora, apertura?.uid)

  const set = (parcial: Partial<BorradorApunte>) => setBorrador((b) => ({ ...b, ...parcial }))

  const cambiarTipo = (tipo: BorradorApunte['tipo']) => {
    const nuevoSentido: SentidoDonacion = 'entregada'
    const c = camposDeTipo(tipo, nuevoSentido)
    setSentido(nuevoSentido)
    setBorrador((b) => {
      const nb: BorradorApunte = { ...b, tipo }
      // Sugerencias de ubicación de frontera según el tipo.
      if (c.origenPorDefecto) nb.ubicacionOrigen = c.origenPorDefecto
      if (c.destinoPorDefecto) nb.ubicacionDestino = c.destinoPorDefecto
      // PÉRDIDA: arranca «sin clasificar» hasta que el alumno elija el subtipo (D2).
      if (tipo === 'PERDIDA') nb.subtipoPerdida = b.subtipoPerdida ?? 'sin-clasificar'
      else delete nb.subtipoPerdida
      // Sentido: la DONACIÓN arranca en el que muestra la pantalla y el AJUSTE en su
      // defecto documentado (corrige saldos, no cola). El resto de tipos no lo llevan.
      if (tipo === 'DONACION') nb.sentido = nuevoSentido
      else if (tipo === 'AJUSTE') nb.sentido = 'solo-saldos'
      else delete nb.sentido
      return nb
    })
  }

  const cambiarSentidoDonacion = (s: SentidoDonacion) => {
    setSentido(s)
    setBorrador((b) => {
      const nb: BorradorApunte = { ...b, sentido: s }
      if (s === 'entregada') {
        delete nb.activoEntrada
        delete nb.cantidadEntrada
        nb.ubicacionDestino = UBICACION_EXTERIOR
      } else {
        delete nb.activoSalida
        delete nb.cantidadSalida
        nb.ubicacionOrigen = UBICACION_EXTERIOR
      }
      return nb
    })
  }

  const guardar = async () => {
    if (!puedeGuardar) return
    setError(null)
    const saneado = sanear(borrador, campos)
    try {
      const res = apertura?.uid
        ? await actualizarApunte(apertura.uid, saneado)
        : await crearApunte(saneado)
      // Con el apunte ya persistido (uid estable), liga sus justificantes del Archivo.
      await reconciliarJustificantes(res.uid, justificantes)
      const nCambios = res.cambios.filter((c) => c.uid !== res.uid).length
      const base = apertura?.uid ? 'Apunte actualizado.' : 'Apunte registrado.'
      const extra = nCambios > 0 ? ` Se reordenó el diario y se renumeraron ${nCambios} apunte(s).` : ''
      onGuardado(base + extra)
      onCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const opcionesUbic = (
    <>
      <option value="">— elegir —</option>
      <option value={UBICACION_EXTERIOR}>EXTERIOR (frontera)</option>
      {ubicaciones.map((u) => (
        <option key={u.id} value={u.id}>
          {u.nombre}
        </option>
      ))}
    </>
  )

  const opcionesActivo = (
    <>
      <option value="">—</option>
      {activos.map((a) => (
        <option key={a.simbolo} value={a.simbolo}>
          {a.simbolo}
        </option>
      ))}
    </>
  )

  // Campo compuesto «cantidad + activo»: NO es un `Field` (Field clona un único hijo). Es un
  // grupo con rótulo propio y dos controles, cada uno con su nombre accesible exacto
  // («Cantidad de salida», «Activo de salida»…), que es lo que pinchan los tests.
  const grupoActivoCantidad = (
    etiqueta: string,
    obligatorio: boolean,
    idLado: string,
    activo: string,
    cantidad: string,
    onActivo: (v: string) => void,
    onCantidad: (v: string) => void,
  ) => (
    <div>
      <span className="mb-1 block text-apoyo font-medium text-texto">
        {etiqueta}
        {obligatorio && (
          <span aria-hidden="true" className="ml-0.5 text-texto-acento">
            *
          </span>
        )}
      </span>
      <div className="flex gap-2">
        <input
          className={cx(INPUT_SISTEMA, 'min-w-0 flex-1')}
          inputMode="decimal"
          placeholder="Cantidad"
          aria-label={`Cantidad de ${idLado}`}
          value={cantidad}
          onChange={(e) => onCantidad(e.target.value)}
        />
        <select
          className={cx(INPUT_SISTEMA, '!w-28 shrink-0')}
          aria-label={`Activo de ${idLado}`}
          value={activo}
          onChange={(e) => onActivo(e.target.value)}
        >
          {opcionesActivo}
        </select>
      </div>
    </div>
  )

  const hayFaltan = erroresMotor.length + faltan.length > 0

  return (
    <Modal titulo={apertura?.titulo ?? 'Nuevo apunte'} abierto={abierto} onCerrar={onCerrar} ancho="max-w-2xl">
      <div className="space-y-5">
        {error && <Banner tono="error">{error}</Banner>}

        {/* QUÉ Y CUÁNDO — el tipo manda sobre qué campos aparecen debajo. */}
        <Card titulo="La operación">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field etiqueta="Tipo de operación">
              <select
                className={INPUT_SISTEMA}
                value={borrador.tipo}
                onChange={(e) => cambiarTipo(e.target.value as BorradorApunte['tipo'])}
              >
                {TIPOS_OPERACION.map((t) => (
                  <option key={t} value={t}>
                    {ETIQUETA_TIPO[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field etiqueta="Fecha y hora" requerido>
              <input
                type="datetime-local"
                className={INPUT_SISTEMA}
                value={borrador.fechaHora}
                onChange={(e) => set({ fechaHora: e.target.value })}
              />
            </Field>
          </div>

          {reordenara && (
            <div className="mt-3">
              <Banner tono="info">
                Esta fecha rompe el orden cronológico: al guardar, el diario se reordenará y
                se renumerarán los correlativos afectados.
              </Banner>
            </div>
          )}
        </Card>

        {/* Pregunta manual: sentido de la donación (ayuda del art. 36 LIRPF, literal). */}
        {campos.preguntaSentidoDonacion && (
          <Card titulo="Sentido de la donación" tono="acento">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-cuerpo text-texto">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sentido"
                  className="accent-brand-600"
                  checked={sentido === 'entregada'}
                  onChange={() => cambiarSentidoDonacion('entregada')}
                />
                Entregada (sale de tu patrimonio)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sentido"
                  className="accent-brand-600"
                  checked={sentido === 'recibida'}
                  onChange={() => cambiarSentidoDonacion('recibida')}
                />
                Recibida (entra a tu patrimonio · ISD)
              </label>
            </div>
            <p className="mt-3 text-apoyo leading-relaxed text-texto-secundario">
              {sentido === 'entregada'
                ? 'Contravalor EUR = valor de transmisión: el que resulte de las normas del ISD, «sin que puedan exceder del valor de mercado» (art. 36 LIRPF). Si el valor declarado en el ISD no es el precio de mercado, teclea aquí el del ISD.'
                : 'Contravalor EUR = coste del lote que nace: «el valor declarado a efectos de Sucesiones y Donaciones, sujeto a comprobación de valores, se convierte en el valor de adquisición del heredero o donatario» (art. 36 LIRPF, con el límite del valor de mercado). Los gastos y tributos inherentes satisfechos por el adquirente se suman al coste (art. 35).'}
            </p>
          </Card>
        )}

        {/* DÓNDE */}
        <Card titulo="Ubicaciones">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field etiqueta="Ubicación origen">
              <select
                className={INPUT_SISTEMA}
                value={borrador.ubicacionOrigen}
                onChange={(e) => set({ ubicacionOrigen: e.target.value })}
              >
                {opcionesUbic}
              </select>
            </Field>
            <Field etiqueta="Ubicación destino">
              <select
                className={INPUT_SISTEMA}
                value={borrador.ubicacionDestino}
                onChange={(e) => set({ ubicacionDestino: e.target.value })}
              >
                {opcionesUbic}
              </select>
            </Field>
          </div>
        </Card>

        {/* CUÁNTO — lados, comisión, contravalor y (solo PERMUTA) los dos valores de mercado. */}
        <Card titulo="Importes">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {campos.salida !== 'oculto' &&
                grupoActivoCantidad(
                  'Salida (lo que sale / se transmite)',
                  campos.salida === 'obligatorio',
                  'salida',
                  borrador.activoSalida ?? '',
                  borrador.cantidadSalida ?? '',
                  (v) => set({ activoSalida: v || undefined }),
                  (v) => set({ cantidadSalida: v }),
                )}
              {campos.entrada !== 'oculto' &&
                grupoActivoCantidad(
                  'Entrada (lo que entra / se adquiere)',
                  campos.entrada === 'obligatorio',
                  'entrada',
                  borrador.activoEntrada ?? '',
                  borrador.cantidadEntrada ?? '',
                  (v) => set({ activoEntrada: v || undefined }),
                  (v) => set({ cantidadEntrada: v }),
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {campos.comision !== 'oculto' && (
                <div>
                  <span className="mb-1 block text-apoyo font-medium text-texto">Comisión</span>
                  <div className="flex gap-2">
                    <input
                      className={cx(INPUT_SISTEMA, 'min-w-0 flex-1')}
                      inputMode="decimal"
                      placeholder="Cantidad"
                      aria-label="Cantidad de comisión"
                      value={borrador.comisionCantidad ?? ''}
                      onChange={(e) => set({ comisionCantidad: e.target.value })}
                    />
                    <select
                      className={cx(INPUT_SISTEMA, '!w-28 shrink-0')}
                      aria-label="Activo de comisión"
                      value={borrador.comisionActivo ?? ''}
                      onChange={(e) => set({ comisionActivo: e.target.value || undefined })}
                    >
                      {opcionesActivo}
                    </select>
                  </div>
                </div>
              )}

              {campos.contravalor !== 'oculto' && (
                <Field
                  etiqueta="Contravalor en euros"
                  requerido={campos.contravalor === 'obligatorio'}
                >
                  <input
                    className={INPUT_SISTEMA}
                    inputMode="decimal"
                    placeholder="0,00"
                    value={borrador.contravalorEUR ?? ''}
                    onChange={(e) => set({ contravalorEUR: e.target.value })}
                  />
                </Field>
              )}
            </div>

            {/* PERMUTA · art. 37.1.h) LIRPF: los dos valores de mercado. Manda el mayor. */}
            {borrador.tipo === 'PERMUTA' && (
              <div className="rounded-panel border border-borde-acento bg-superficie-acento p-3">
                <p className="mb-3 text-cuerpo font-medium text-texto">
                  Valores de mercado de la permuta{' '}
                  <span className="font-normal text-texto-secundario">
                    — el art. 37.1.h) LIRPF cuantifica por el <strong>mayor</strong> de los dos, y ese
                    importe es también el coste del lote que nace (manual, U6.4)
                  </span>
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field etiqueta="Valor de mercado de lo entregado (EUR)">
                    <input
                      className={INPUT_SISTEMA}
                      inputMode="decimal"
                      placeholder="0,00"
                      value={borrador.valorMercadoEntregadoEUR ?? ''}
                      onChange={(e) => set({ valorMercadoEntregadoEUR: e.target.value })}
                    />
                  </Field>
                  <Field etiqueta="Valor de mercado de lo recibido (EUR)">
                    <input
                      className={INPUT_SISTEMA}
                      inputMode="decimal"
                      placeholder="0,00"
                      value={borrador.valorMercadoRecibidoEUR ?? ''}
                      onChange={(e) => set({ valorMercadoRecibidoEUR: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* RECTIFICACIÓN (solo AJUSTE): a qué apunte y por qué. */}
        {campos.rectificaA === 'obligatorio' && (
          <Card titulo="Rectificación">
            <Field etiqueta="Apunte que rectifica" requerido>
              <select
                className={INPUT_SISTEMA}
                value={borrador.rectificaAUid ?? ''}
                onChange={(e) => set({ rectificaAUid: e.target.value || undefined })}
              >
                <option value="">— elegir apunte —</option>
                {registros
                  .filter((r) => r.uid !== apertura?.uid)
                  .map((r) => (
                    <option key={r.uid} value={r.uid}>
                      {r.id} · {ETIQUETA_TIPO[r.tipo]} · {fmtFechaHora(r.fechaHora)}
                    </option>
                  ))}
              </select>
            </Field>
          </Card>
        )}

        {/* Notas / causa de la rectificación */}
        <Field
          etiqueta={campos.causaObligatoria ? 'Causa de la rectificación' : 'Notas'}
          requerido={campos.causaObligatoria}
        >
          <textarea
            className={INPUT_SISTEMA}
            rows={2}
            value={borrador.notas ?? ''}
            onChange={(e) => set({ notas: e.target.value })}
          />
        </Field>

        {/* PÉRDIDA: subtipo (error/robo/estafa) → criterio fiscal y checklist probatorio (D2). */}
        {borrador.tipo === 'PERDIDA' && (
          <SubtipoPerdidaBloque
            valor={borrador.subtipoPerdida ?? 'sin-clasificar'}
            onCambio={(s) => set({ subtipoPerdida: s })}
          />
        )}

        {/* Justificantes (Archivo probatorio) */}
        <SeccionJustificantes
          tipo={borrador.tipo}
          conKyc={conKyc}
          value={justificantes}
          onChange={setJustificantes}
        />

        {/* Validación en vivo: errores del motor y campos que faltan BLOQUEAN (rojo); los
            avisos blandos no (ámbar/info). Mismo lenguaje visual del semáforo. */}
        {hayFaltan && (
          <Banner tono="error">
            <ul className="ml-4 list-disc space-y-0.5">
              {erroresMotor.map((a) => (
                <li key={a.codigo}>{a.mensaje}</li>
              ))}
              {faltan.map((f) => (
                <li key={f.campo}>Falta: {f.etiqueta}.</li>
              ))}
            </ul>
          </Banner>
        )}
        {erroresMotor.length === 0 && avisosBlandos.length > 0 && (
          <Banner tono="info">
            <ul className="ml-4 list-disc space-y-0.5">
              {avisosBlandos.map((a) => (
                <li key={a.codigo}>{a.mensaje}</li>
              ))}
            </ul>
          </Banner>
        )}

        <div className="flex justify-end gap-2 border-t border-borde pt-4">
          <button type="button" className={BTN_SECUNDARIO} onClick={onCerrar}>
            Cancelar
          </button>
          <button type="button" className={BTN_PRIMARIO} onClick={guardar} disabled={!puedeGuardar}>
            {apertura?.uid ? 'Guardar cambios' : 'Registrar apunte'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Bloque de subtipo de PÉRDIDA (derivada D2): selector + aviso de criterio fiscal + checklist
 * probatorio del subtipo. Orientativo (Regla 5); toda pérdida computable va a la BASE GENERAL.
 * Los literales fiscales (`encajeFiscal`, `aviso`, checklist) van intactos (regla B).
 */
function SubtipoPerdidaBloque({
  valor,
  onCambio,
}: {
  valor: SubtipoPerdida
  onCambio: (s: SubtipoPerdida) => void
}) {
  const def = SUBTIPOS_PERDIDA[valor]
  return (
    <Card titulo="Subtipo de la pérdida (criterio fiscal y prueba)" tono="acento">
      <div className="space-y-3">
        <Field etiqueta="¿Qué clase de pérdida es?">
          <select
            className={INPUT_SISTEMA}
            value={valor}
            onChange={(e) => onCambio(e.target.value as SubtipoPerdida)}
          >
            {SUBTIPOS_PERDIDA_ELEGIBLES.map((s) => (
              <option key={s} value={s}>
                {SUBTIPOS_PERDIDA[s].etiqueta}
              </option>
            ))}
          </select>
        </Field>

        {valor === 'sin-clasificar' && (
          <Banner tono="info">
            Clasifica el subtipo para ver el criterio de deducibilidad y el checklist probatorio.
          </Banner>
        )}

        <p className="text-apoyo font-medium text-texto">{def.encajeFiscal}</p>
        <p className="text-apoyo leading-relaxed text-texto-secundario">{def.aviso}</p>

        <div>
          <p className="text-apoyo font-semibold text-texto-secundario">Checklist probatorio:</p>
          <ul className="ml-4 list-disc space-y-0.5 text-apoyo text-texto-secundario">
            {def.checklist.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
        <p className="text-caption italic text-texto-mudo">
          {FECHA_CRITERIO_PERDIDAS} Orientativo; no sustituye la revisión de un profesional.
        </p>
      </div>
    </Card>
  )
}

/** Borrador vacío por defecto (COMPRA). */
function vacio(): BorradorApunte {
  return {
    fechaHora: '',
    tipo: 'COMPRA',
    ubicacionOrigen: '',
    ubicacionDestino: '',
  }
}
