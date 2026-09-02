/**
 * CarteraPage — pestaña «Cartera» (P9.2). Vista «enseña» de la cartera: TODO sale del motor
 * (saldos, cola FIFO, GyP por ejercicio) + un único dato nuevo del usuario, el PRECIO MANUAL.
 *
 * Local-first estricto (Regla de oro 3): los precios los teclea el alumno; PROHIBIDO cualquier
 * fetch/API de cotizaciones. El motor (src/engine) no se toca: esta página LEE sus resultados a
 * través de la capa pura `ui/cartera/valoracion`.
 *
 * CONTRATO E2E (cartera.spec.ts): el heading «Cartera»; «Valor estimado» y su cifra HERMANOS
 * dentro del mismo padre (el `Stat` los deja así: dt y dd bajo el mismo div); el campo
 * `aria-label="Precio manual de BTC en euros"`; y la celda de Valor con el importe EXACTO
 * (`fmtEuro` a secas, sin sufijos ni chips dentro).
 */
import { useMemo, useRef, useState, type RefObject } from 'react'
import type { SimboloActivo } from '../../engine/types'
import {
  listarApuntes,
  listarUbicaciones,
  listarActivos,
  listarPrecios,
  listarRegistros,
  listarJustificantes,
  justificantesADominio,
  guardarPrecio,
} from '../../data/repositorio'
import { useLiveQuery } from '../../data/useLiveQuery'
import { ejerciciosConDatos } from '../../engine/fiscal'
import {
  COLOR_OTROS,
  calcularCartera,
  gypRealizadaPorEjercicio,
  type ResumenCartera,
} from '../cartera/valoracion'
import { DonutDistribucion, type SegmentoDonut } from '../cartera/DonutDistribucion'
import { BarrasGyp } from '../cartera/BarrasGyp'
import { fmtDecimal, fmtEuro, fmtFecha, parseDecimalEntrada } from '../formato'
import {
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  Banner,
  Card,
  Chip,
  EmptyState,
  INPUT_SISTEMA,
  PageHeader,
  Stat,
  Tabla,
} from '../comp'
import { irA } from '../shell/rutas'

export function CarteraPage() {
  const apuntesQ = useLiveQuery(listarApuntes, [])
  const ubicacionesQ = useLiveQuery(listarUbicaciones, [])
  const activosQ = useLiveQuery(listarActivos, [])
  const preciosQ = useLiveQuery(listarPrecios, [])
  const registrosQ = useLiveQuery(listarRegistros, [])
  const justificantesQ = useLiveQuery(listarJustificantes, [])

  const apuntes = apuntesQ.estado === 'listo' ? apuntesQ.datos : []
  const ubicaciones = ubicacionesQ.estado === 'listo' ? ubicacionesQ.datos : []
  const activos = activosQ.estado === 'listo' ? activosQ.datos : []
  const precios = preciosQ.estado === 'listo' ? preciosQ.datos : []
  const registros = registrosQ.estado === 'listo' ? registrosQ.datos : []
  const justificantes = justificantesQ.estado === 'listo' ? justificantesQ.datos : []

  // Predicado esFiat desde el catálogo de activos (EUR de serie es fiat).
  const esFiat = useMemo(() => {
    const set = new Set(activos.filter((a) => a.esFiat).map((a) => a.simbolo))
    set.add('EUR')
    return (a: string) => set.has(a)
  }, [activos])

  // Precios manuales como Record<activo, precioEur> para la capa de valoración.
  const preciosRecord = useMemo(() => {
    const out: Record<string, string> = {}
    for (const p of precios) out[p.activo] = p.precioEur
    return out
  }, [precios])

  const { resumen, error } = useMemo(() => {
    try {
      return { resumen: calcularCartera(apuntes, preciosRecord, esFiat), error: null as string | null }
    } catch (e) {
      return { resumen: null, error: e instanceof Error ? e.message : String(e) }
    }
  }, [apuntes, preciosRecord, esFiat])

  const justificantesDom = useMemo(
    () => justificantesADominio(justificantes, registros),
    [justificantes, registros],
  )
  const gyp = useMemo(
    () => gypRealizadaPorEjercicio(apuntes, ubicaciones, justificantesDom),
    [apuntes, ubicaciones, justificantesDom],
  )

  const ejercicios = useMemo(() => ejerciciosConDatos(apuntes), [apuntes])
  const [ejercicio, setEjercicio] = useState<number | null>(null)
  const ejercicioActivo = ejercicio ?? ejercicios[0] ?? new Date().getFullYear()
  const gypEjercicio = gyp.find((g) => g.ejercicio === ejercicioActivo)?.netoEUR ?? '0'

  // Fecha de introducción de los precios (la más reciente) para el chip.
  const fechaPrecios = precios.reduce<string | null>(
    (acc, p) => (acc === null || p.fechaISO > acc ? p.fechaISO : acc),
    null,
  )

  // Foco a la columna de precios («Actualizar precios…»).
  const primerPrecioRef = useRef<HTMLInputElement>(null)
  const enfocarPrecios = () => {
    primerPrecioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    primerPrecioRef.current?.focus()
  }

  // Estado vacío: sin apuntes.
  if (apuntesQ.estado === 'listo' && apuntes.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader titulo="Cartera" />
        <EmptyState
          titulo="Aún no hay apuntes: no hay cartera que valorar"
          descripcion="Registra operaciones en el Libro para calcular saldos, coste FIFO y distribución."
          accion={
            <button type="button" className={BTN_PRIMARIO} onClick={() => irA('diario')}>
              Abrir mi libro
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Cartera"
        subtitulo={
          <Chip tono="brand">
            Precios manuales
            {fechaPrecios ? ` · introducidos el ${fmtFecha(fechaPrecios)}` : ''} · nada sale de tu
            navegador
          </Chip>
        }
        acciones={
          <>
            <label className="text-cuerpo text-texto-secundario">
              Ejercicio{' '}
              <select
                className={`${INPUT_SISTEMA} inline-block w-auto max-w-full`}
                value={ejercicioActivo}
                onChange={(e) => setEjercicio(Number(e.target.value))}
              >
                {(ejercicios.length > 0 ? ejercicios : [ejercicioActivo]).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className={BTN_SECUNDARIO} onClick={enfocarPrecios}>
              Actualizar precios…
            </button>
          </>
        }
      />

      {error && <Banner tono="error">No se pudo calcular la cartera: {error}</Banner>}

      {resumen && (
        <>
          {/* 4 cifras de resumen: Card + Stat del sistema (el patrón de Fiscal y Cierre).
              UNA COLUMNA hasta `sm`. A 390 px, dos columnas dejaban la Card en 173 px y, con el
              `p-4` de dentro, la cifra se quedaba con 139: «+28.748,98 €» en `text-cifra` (30 px)
              mide 187 px y se salía 15 px de la pantalla —la página entera se desplazaba a lo
              ancho—. El número no puede partirse (el espacio antes del € es duro), así que no hay
              arreglo por tipografía: o cabe o desborda. Con una columna la Card mide 358 px y
              sobra sitio, comprobado también a 360. El fallo NO se ve en Windows: con Segoe UI la
              misma cifra mide menos de 173 px y cabe por los pelos; salta con las métricas de
              cualquier otra fuente de sistema —el Linux del CI, y un iPhone a 390—. Es el mismo
              riesgo latente de Fiscal, Cierre e Inicio, que hoy se salvan porque sus Stat no van
              dentro de una Card con relleno y tienen 34 px más de holgura. */}
          <section aria-label="Resumen de la cartera" className="grid gap-3 lg:grid-cols-12">
            <Card tono="acento" className="lg:col-span-5 lg:flex lg:min-h-52 lg:items-center">
              <dl>
                <Stat etiqueta="Valor estimado" valor={fmtEuroCartera(resumen.valorTotalEUR)} />
              </dl>
            </Card>
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
              <Card className="sm:col-span-2">
                <dl>
                  <Stat
                    etiqueta="Coste FIFO restante (cripto)"
                    valor={fmtEuroCartera(resumen.costeRestanteCriptoEUR)}
                  />
                </dl>
              </Card>
              <Card>
                <dl>
                  <Stat
                    etiqueta={`GyP realizada · ${ejercicioActivo}`}
                    valor={<CifraConSigno valor={gypEjercicio} />}
                  />
                </dl>
              </Card>
              <Card>
                <dl>
                  <Stat
                    etiqueta="Plusvalía latente (cripto)"
                    valor={<CifraConSigno valor={resumen.plusvaliaLatenteEUR} />}
                    apoyo="no realizada — no tributa aún"
                  />
                </dl>
              </Card>
            </div>
          </section>

          {/* Gráficos. */}
          <section className="grid gap-4 lg:grid-cols-2">
            <Card aria-labelledby="cartera-distribucion">
              <h2
                id="cartera-distribucion"
                className="mb-2 text-titulo font-semibold tracking-tight text-texto"
              >
                Distribución por activo
              </h2>
              <GraficoDistribucion resumen={resumen} />
            </Card>
            <Card aria-labelledby="cartera-gyp">
              <h2 id="cartera-gyp" className="mb-2 text-titulo font-semibold tracking-tight text-texto">
                GyP realizada por ejercicio
              </h2>
              {gyp.length > 0 ? (
                <BarrasGyp datos={gyp} />
              ) : (
                <p className="py-8 text-center text-cuerpo text-texto-mudo">Sin transmisiones aún.</p>
              )}
            </Card>
          </section>

          {/* Tabla de posiciones (vista accesible de los gráficos). */}
          <TablaPosiciones resumen={resumen} onGuardar={guardarPrecio} primerRef={primerPrecioRef} />
        </>
      )}

      {/* Pie. */}
      <p className="text-center text-apoyo text-texto-mudo">
        Valoración orientativa a precios manuales. No es asesoramiento ni declaración.
      </p>
    </div>
  )
}

/** Euro o guion largo (los Stat muestran «—» cuando falta el precio). */
function fmtEuroCartera(valor: string | null): string {
  return valor === null ? '—' : fmtEuro(valor)
}

/** Cifra con signo y color: pérdida en el rojo del semáforo, ganancia en el acento. */
function CifraConSigno({ valor }: { valor: string | null }) {
  if (valor === null) return <>—</>
  const negativo = Number(valor) < 0
  const positivo = Number(valor) > 0
  return (
    <span
      className={
        negativo ? 'text-semaforo-error dark:text-red-400' : positivo ? 'text-texto-acento' : undefined
      }
    >
      {positivo ? '+' : ''}
      {fmtEuro(valor)}
    </span>
  )
}

/** Donut + leyenda (etiquetado directo). Agrupa el 5.º cripto en adelante en «Otros». */
function GraficoDistribucion({ resumen }: { resumen: ResumenCartera }) {
  const conValor = resumen.posiciones.filter((p) => p.valorEUR !== null)
  const totalNum = conValor.reduce((acc, p) => acc + Number(p.valorEUR), 0)

  const normales = conValor.filter((p) => !p.agrupadaEnOtros)
  const agrupadas = conValor.filter((p) => p.agrupadaEnOtros)
  const segmentos: SegmentoDonut[] = normales.map((p) => ({
    label: p.activo,
    valor: Number(p.valorEUR),
    valorTexto: fmtEuro(p.valorEUR),
    pct: p.pesoPct ?? 0,
    color: p.color,
  }))
  if (agrupadas.length > 0) {
    const valor = agrupadas.reduce((acc, p) => acc + Number(p.valorEUR), 0)
    segmentos.push({
      label: 'Otros',
      valor,
      valorTexto: fmtEuro(String(valor)),
      pct: totalNum > 0 ? (valor / totalNum) * 100 : 0,
      color: COLOR_OTROS,
    })
  }

  if (conValor.length === 0) {
    return (
      <p className="py-8 text-center text-cuerpo text-texto-mudo">
        Introduce precios para valorar la cartera.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <DonutDistribucion segmentos={segmentos} totalTexto={fmtEuro(resumen.valorTotalEUR)} />
      <ul className="min-w-0 flex-1 space-y-1 text-cuerpo">
        {segmentos.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <span className="font-medium text-texto">{s.label}</span>
            <span className="ml-auto tabular-nums text-texto-secundario">{s.valorTexto}</span>
            <span className="w-12 text-right tabular-nums text-texto-mudo">
              {s.pct.toFixed(1).replace('.', ',')} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Tabla «Posiciones» con precio manual editable en línea. */
function TablaPosiciones({
  resumen,
  onGuardar,
  primerRef,
}: {
  resumen: ResumenCartera
  onGuardar: (activo: SimboloActivo, precioEur: string, fechaISO: string) => Promise<void>
  primerRef: RefObject<HTMLInputElement>
}) {
  // Estado de edición en curso por activo (texto tal cual lo teclea el alumno, es-ES).
  const [edicion, setEdicion] = useState<Record<string, string>>({})

  const confirmar = async (activo: string) => {
    const bruto = edicion[activo]
    if (bruto === undefined) return
    const normal = parseDecimalEntrada(bruto)
    const valido = normal === '' || /^-?\d+(\.\d+)?$/.test(normal)
    await onGuardar(activo, valido ? normal : '', new Date().toISOString().slice(0, 10))
    setEdicion((e) => {
      const { [activo]: _drop, ...resto } = e
      return resto
    })
  }

  // El primer input cripto recibe la ref (para «Actualizar precios…»).
  let primerAsignado = false

  return (
    <section aria-labelledby="cartera-posiciones" className="space-y-2">
      <h2 id="cartera-posiciones" className="text-titulo font-semibold tracking-tight text-texto">
        Posiciones
      </h2>
      <Tabla>
        <thead>
          <tr>
            <th scope="col">Activo</th>
            <th scope="col" data-num>Saldo</th>
            <th scope="col" data-num>Coste FIFO restante</th>
            <th scope="col" data-num>Precio manual (EUR)</th>
            <th scope="col" data-num>Valor</th>
            <th scope="col" data-num>Peso</th>
          </tr>
        </thead>
        <tbody>
          {resumen.posiciones.map((p) => {
            const editable = !p.esFiat
            const asignarRef = editable && !primerAsignado
            if (asignarRef) primerAsignado = true
            const valorInput = edicion[p.activo] ?? (p.precioEur ? fmtDecimal(p.precioEur) : '')
            return (
              <tr key={p.activo}>
                <td>
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block h-3 w-3 rounded-sm"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="font-medium text-texto">{p.activo}</span>
                  </span>
                </td>
                <td data-num>{fmtDecimal(p.saldo)}</td>
                <td data-num className="text-texto-secundario">
                  {p.costeFifoRestanteEUR === null ? '—' : fmtEuro(p.costeFifoRestanteEUR)}
                </td>
                <td data-num>
                  {editable ? (
                    <input
                      ref={asignarRef ? primerRef : undefined}
                      className={`${INPUT_SISTEMA} w-28 text-right`}
                      inputMode="decimal"
                      aria-label={`Precio manual de ${p.activo} en euros`}
                      placeholder="p. ej. 60.000"
                      value={valorInput}
                      onChange={(e) => setEdicion((s) => ({ ...s, [p.activo]: e.target.value }))}
                      onBlur={() => void confirmar(p.activo)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void confirmar(p.activo)
                          ;(e.target as HTMLInputElement).blur()
                        }
                      }}
                    />
                  ) : (
                    <span className="text-texto-mudo">—</span>
                  )}
                </td>
                {/* La celda de Valor lleva el importe A SECAS: cartera.spec.ts la busca con
                    `exact: true` y un sufijo o un chip dentro rompe el contrato. */}
                <td data-num className="font-medium text-texto">
                  {p.valorEUR === null ? '—' : fmtEuro(p.valorEUR)}
                </td>
                <td data-num className="text-texto-mudo">
                  {p.pesoPct === null ? '—' : `${p.pesoPct.toFixed(1).replace('.', ',')} %`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </Tabla>
    </section>
  )
}
