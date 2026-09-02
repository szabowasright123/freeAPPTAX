/**
 * AppShell.tsx — layout raíz con navegación entre las secciones del Libro.
 * Aloja el enrutado por hash y monta la página activa.
 *
 * Cabecera en dos idiomas visuales distintos (diagnóstico §5): las OCHO secciones son
 * pestañas con subrayado de posición en la propia cabecera; los apartados de cada sección
 * son un control segmentado pegado al contenido (SubNav). Así «Diario» ya no aparece con la
 * misma ropa en la pestaña y en la subpestaña. La barra de secciones no desborda nunca la
 * página: cuando no caben las ocho, se desliza en horizontal con sombras de borde que avisan
 * de que hay más (nada de esconderlas tras un menú, decisión v1.6.1).
 *
 * ANCHO DEL CONTENEDOR. Los tres bloques de la página —cabecera, `<main>` y pie— comparten
 * ancho a propósito: si el contenido se ensancha y la navegación no, las dos columnas dejan
 * de alinearse y se ve roto. `max-w-6xl` (1.152 px) hasta 1536 px de ventana y **1.440 px de
 * ahí en adelante** (`2xl:max-w-[90rem]`): en un portátil de 1366 no cambia absolutamente
 * nada, y en un monitor de 24" el Diario deja de recortar sus dos cabeceras. La medición que
 * lo decidió está en `docs/ESTADO.md` (27-8-2026): a 1920 sobraban 400 px por lado y el
 * Diario era el único que recortaba dato por falta de contenedor. No es fluido hasta el
 * infinito porque una fila de tabla más ancha ya no se sigue con la vista, y `max-w-lectura`
 * (66 ch) no se toca en ningún sitio: el texto largo sigue midiendo lo mismo.
 */
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { RUTAS, useRuta, irA, rutaPrincipal, subrutasDe, etiquetaDe, type Ruta } from './rutas'
import { cx, FOCO } from '../comp'
import { ErrorBoundary } from './ErrorBoundary'
import { useFalloLectura } from '../../data/estadoDatos'
import { HomePage } from '../pages/HomePage'
import { DiarioPage } from '../pages/DiarioPage'
import { CarteraPage } from '../pages/CarteraPage'
import { PosicionesPage } from '../pages/PosicionesPage'
import { ArchivoPage } from '../pages/ArchivoPage'
import { AcercaPage } from '../pages/AcercaPage'
import { BotonTema } from '../tema-ui'

// Ajustes arrastra las librerías pesadas de xlsx (SheetJS) y exceljs: se carga bajo
// demanda para no engordar el arranque (local-first: el resto de la app va ligero).
const AjustesPage = lazy(() =>
  import('../pages/AjustesPage').then((m) => ({ default: m.AjustesPage })),
)

// La importación desde exploradores de bloques solo se usa a ratos: también bajo demanda.
const ImportarPage = lazy(() =>
  import('../pages/ImportarPage').then((m) => ({ default: m.ImportarPage })),
)

/** Aviso de «cargando…» de las páginas diferidas, con la voz del sistema. */
function Cargando({ que }: { que: string }) {
  return <p className="text-apoyo text-texto-mudo">Cargando {que}…</p>
}

/** Mapea cada ruta a su página. */
function Pagina({ ruta }: { ruta: Ruta }) {
  switch (ruta) {
    case 'inicio':
      return <HomePage />
    case 'diario':
      return <DiarioPage />
    case 'cartera':
      return <CarteraPage />
    case 'posiciones':
      return <PosicionesPage />
    case 'archivo':
      return <ArchivoPage />
    case 'acerca':
      return <AcercaPage />
    case 'ajustes':
      return (
        <Suspense fallback={<Cargando que="Ajustes" />}>
          <AjustesPage />
        </Suspense>
      )
    case 'importar':
      return (
        <Suspense fallback={<Cargando que="la importación" />}>
          <ImportarPage />
        </Suspense>
      )
  }
}

/**
 * AvisoLectura — el aviso de que la base local no responde.
 *
 * Va aquí, encima de la página y en TODAS las rutas, porque el fallo es del sistema y no de
 * una pantalla: diecisiete de las diecinueve leen con `estado === 'listo' ? datos : []` y sin
 * este aviso un error de lectura se ve, sencillamente, como un Libro VACÍO (ver
 * `data/estadoDatos.ts`). Prefiero decirlo una vez aquí que repetirlo diecisiete veces abajo.
 */
function AvisoLectura() {
  const fallo = useFalloLectura()
  if (!fallo) return null
  return (
    <div
      role="alert"
      className="mb-4 rounded-panel border border-red-300 bg-red-50 px-3 py-2 text-cuerpo text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
    >
      <p className="">
        <strong>No se ha podido leer tu Libro en este navegador.</strong> Lo que veas ahora
        puede estar incompleto o vacío, pero <strong>eso no significa que se haya borrado</strong>.
        No registres nada nuevo ni borres nada: recarga la página y, si sigue igual, cierra el
        navegador y vuelve a abrirlo.
      </p>
      <p className="mt-1 font-mono text-caption opacity-80">{fallo.mensaje}</p>
    </div>
  )
}

export function AppShell() {
  const ruta = useRuta()
  const principal = rutaPrincipal(ruta)
  const subrutas = subrutasDe(ruta)

  return (
    // El lienzo de la app sale de los tokens del sistema (D1): stone-50 en claro, stone-950
    // en oscuro. Toda la cabecera, el SubNav y el pie hablan ya en tokens, sin grises fríos.
    <div className="min-h-full bg-superficie text-texto">
      <header className="sticky top-0 z-40 border-b border-borde bg-superficie-elevada/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 2xl:max-w-[90rem]">
          {/* Fila 1: marca discreta + utilidades. Siempre cabe (la marca se recorta antes
              que desbordar), así la página nunca se desplaza en horizontal. */}
          <div className="flex items-center gap-4 py-2.5">
            <button
              type="button"
              onClick={() => irA('inicio')}
              className={cx('flex min-w-0 rounded-control text-left', FOCO)}
            >
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-titulo font-semibold tracking-tight text-texto">
                  Libro Hespérides
                </span>
                <span className="block truncate text-caption text-texto-mudo">
                  Libro y archivo personal
                </span>
              </span>
            </button>

            <div className="ml-auto flex shrink-0 items-center gap-3">
              <BotonTema />
              <span className="hidden font-mono text-caption text-texto-mudo sm:inline">
                v{__APP_VERSION__}
              </span>
            </div>
          </div>

          {/* Fila 2: las ocho secciones como pestañas con subrayado de posición. Cuando no
              caben, la barra se desliza; el subrayado marca «estás aquí» sin depender solo
              del color. */}
          <div className="flex items-end gap-4">
            <BarraSecciones principal={principal} />
            {/* §5.3 — en las rutas que no cuelgan de ninguna pestaña (p. ej. «Acerca de»,
                a la que se llega por el pie) la cabecera lo dice en palabras. */}
            {principal === null && (
              <p className="shrink-0 whitespace-nowrap pb-2.5 text-cuerpo">
                <span className="text-texto-mudo">Estás en </span>
                <span className="font-semibold text-texto">{etiquetaDe(ruta)}</span>
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 2xl:max-w-[90rem]">
        {subrutas.length > 1 && (
          <SubNav
            rutaActual={ruta}
            entradas={subrutas}
            /* La visita ilumina aquí su parada del Taller: sus apartados —entregables,
               ejercicios de autoevaluación, corrección, revisión del método y entrega— son
               justo lo que esa parada cuenta, y caben en un control de 40 px de alto. El
               ancla se pone SOLO estando en el Taller: si viviera fija en el SubNav, la
               visita la encontraría también en el Diario o en Fiscal mientras navega allí. */
          />
        )}
        <AvisoLectura />
        {/* `key={ruta}`: al cambiar de sección el límite se vuelve a montar y se reinicia
            solo. Sin esto, una pantalla rota dejaría el error pegado al navegar a otra. */}
        <ErrorBoundary alcance="pagina" key={ruta}>
          <Pagina ruta={ruta} />
        </ErrorBoundary>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-6 text-center text-caption text-texto-mudo print:hidden 2xl:max-w-[90rem]">
        <button
          type="button"
          onClick={() => irA('acerca')}
          aria-current={ruta === 'acerca' ? 'page' : undefined}
          className={cx('rounded-control underline underline-offset-2 hover:text-texto-acento', FOCO)}
        >
          Acerca de
        </button>
        <span className="mx-2">·</span>
        <span>Local-first · tus datos no salen de tu navegador</span>
        <span className="mx-2">·</span>
        <span className="font-mono">v{__APP_VERSION__}</span>
      </footer>
    </div>
  )
}

/**
 * Barra de las ocho secciones. Deslizable en horizontal cuando no caben (viewport estrecho),
 * con sombras de borde que aparecen solo cuando hay más contenido hacia ese lado y una
 * pestaña activa inconfundible: peso + subrayado de posición. Al cambiar de sección —y con el
 * foco por teclado, de serie del navegador— la pestaña activa entra sola en pantalla.
 */
function BarraSecciones({ principal }: { principal: Ruta | null }) {
  const scroller = useRef<HTMLElement | null>(null)
  const activo = useRef<HTMLButtonElement | null>(null)
  const [sombra, setSombra] = useState({ izq: false, der: false })

  const medir = useCallback(() => {
    const el = scroller.current
    if (!el) return
    const izq = el.scrollLeft > 1
    const der = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    setSombra((s) => (s.izq === izq && s.der === der ? s : { izq, der }))
  }, [])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    medir()
    el.addEventListener('scroll', medir, { passive: true })
    window.addEventListener('resize', medir)
    return () => {
      el.removeEventListener('scroll', medir)
      window.removeEventListener('resize', medir)
    }
  }, [medir])

  // Al cambiar de pestaña activa, traerla a la vista y recalcular las sombras.
  useEffect(() => {
    activo.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
    medir()
  }, [principal, medir])

  return (
    <div className="relative min-w-0 flex-1">
      <nav
        ref={scroller}
        aria-label="Secciones"
        className="flex gap-1 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {RUTAS.map(({ ruta: r, etiqueta }) => {
          const activa = principal === r
          return (
            <button
              key={r}
              ref={activa ? activo : undefined}
              type="button"
              onClick={() => irA(r)}
              aria-current={activa ? 'page' : undefined}
              className={cx(
                'relative shrink-0 whitespace-nowrap rounded-control px-3 pb-2.5 pt-1.5 text-cuerpo transition-colors',
                FOCO,
                activa
                  ? 'font-semibold text-texto-acento'
                  : 'font-medium text-texto-secundario hover:bg-superficie hover:text-texto',
              )}
            >
              {etiqueta}
              {activa && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 bottom-0 h-0.5 rounded-pildora bg-brand-500"
                />
              )}
            </button>
          )
        })}
      </nav>
      {sombra.izq && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-superficie-elevada to-transparent"
        />
      )}
      {sombra.der && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-superficie-elevada to-transparent"
        />
      )}
    </div>
  )
}

/**
 * Apartados de una sección (Cartera → Posiciones; Ajustes → Ubicaciones, Parámetros…) como
 * CONTROL SEGMENTADO pegado al contenido: una pista con las opciones dentro, la activa
 * elevada. Idioma visual distinto al de las pestañas de la cabecera, para que no se confundan
 * (§5.1). Se pinta dentro de la página, nunca en un desplegable; en móvil envuelve a dos
 * líneas antes que desbordar.
 */
function SubNav({
  rutaActual,
  entradas,
  anclaVisita,
}: {
  rutaActual: Ruta
  entradas: { ruta: Ruta; etiqueta: string }[]
  /** Ancla de la visita guiada, si la sección en curso es una de sus paradas. */
  anclaVisita?: string
}) {
  return (
    <nav className="mb-5 print:hidden" aria-label="Apartados">
      <div
        className="inline-flex max-w-full flex-wrap gap-1 rounded-panel border border-borde bg-superficie p-1"
        data-visita={anclaVisita}
      >
        {entradas.map(({ ruta: r, etiqueta }) => {
          const activa = rutaActual === r
          return (
            <button
              key={r}
              type="button"
              onClick={() => irA(r)}
              aria-current={activa ? 'page' : undefined}
              className={cx(
                'rounded-control px-3 py-1 text-cuerpo transition-colors',
                FOCO,
                activa
                  ? 'bg-superficie-elevada font-semibold text-texto shadow-reposo'
                  : 'font-medium text-texto-secundario hover:text-texto',
              )}
            >
              {etiqueta}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
