/**
 * comp.tsx — el sistema de componentes de la interfaz.
 *
 * Nació como kit mínimo (cuatro clases de botón, un input, un modal y un banner) y en la
 * fase D1 del rediseño (docs/ENCARGO_DISENO_UI.md) crece hasta cubrir los patrones que el
 * diagnóstico encontró copiados a mano por toda la app: 18 cabeceras de página, 29 cadenas
 * de clase para «tarjeta», 49 tablas con 22 rellenos de celda distintos, 26 chips, 15
 * estados vacíos y 41 cajas de aviso fuera de `Banner`.
 *
 * REGLAS DE LA CASA (regla C del encargo):
 * - Las variantes van por PROP, no por `className` suelto. Si hace falta una variante nueva,
 *   se añade aquí; no se parchea desde la pantalla.
 * - Todo color, tamaño, radio y sombra sale de los tokens de `tailwind.config.js`. Ni un hex,
 *   ni un `text-[Npx]`, ni un gris de la familia fría que se proscribió en D1.
 * - Los tokens semánticos (`superficie`, `texto`, `borde`…) ya valen para los dos temas: no
 *   hace falta escribir la pareja `… dark:…` salvo en los colores del semáforo, que sí
 *   necesitan tono claro sobre fondo oscuro.
 *
 * Sin lógica de dominio: presentación pura para las páginas del Libro.
 */
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react'

/* ────────────────────────────────────────────────────────────────────────────────────────
 * CLASES DE BOTÓN Y DE CONTROL
 *
 * En D7 se jubilaron las tres piezas heredadas de la v1.8.0 (`BTN_SEC`, `BTN_PELIGRO` e
 * `INPUT`), que existían solo para que las pantallas sin migrar conservaran su aspecto
 * mientras les llegaba el turno. Al cerrar D6 no las usaba ninguna, y con ellas se fueron las
 * últimas ocho clases del gris frío proscrito en D1. Lo que queda sale entero de los tokens.
 * ──────────────────────────────────────────────────────────────────────────────────────── */

/** Clases de botón reutilizables: la base común a todas las variantes. */
export const BTN =
  'inline-flex items-center justify-center gap-1.5 rounded-control px-3.5 py-2 text-cuerpo font-semibold ' +
  'transition-all active:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ' +
  'disabled:cursor-not-allowed disabled:opacity-50'
export const BTN_PRIMARIO = `${BTN} bg-brand-600 text-white shadow-reposo hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-elevada`

/**
 * Botón secundario DEL SISTEMA: la acción que acompaña a la primaria.
 *
 * Nació en D1 junto al heredado `BTN_SEC`, que en oscuro se vestía con el gris frío de la
 * v1.8.0 y sobre el lienzo cálido se leía como una mancha azul. En D7, jubilado aquel, este
 * es el único botón secundario de la app.
 */
export const BTN_SECUNDARIO = `${BTN} border border-borde-fuerte bg-superficie-elevada text-texto hover:bg-superficie`

/**
 * Botón secundario COMPACTO del sistema: el mismo papel que `BTN_SECUNDARIO` dentro de una
 * ficha densa (la ficha de apunte de la autocorrección), donde el tamaño normal desequilibra
 * la línea. Nace en D6 para jubilar los `!px-2 !py-0.5` con que se parcheaba desde la página.
 */
export const BTN_SECUNDARIO_COMPACTO =
  'inline-flex items-center justify-center gap-1 rounded-control px-2 py-0.5 text-apoyo font-medium ' +
  'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'border border-borde-fuerte bg-superficie-elevada text-texto hover:bg-superficie'

/**
 * Botón de acción DESTRUCTIVA del sistema, en el rojo del semáforo. Discreto en reposo —una
 * acción destructiva no debe competir con el dato (diagnóstico §4)— y rojo franco al pasar
 * por encima. Sustituye al heredado `BTN_PELIGRO`, jubilado en D7.
 */
export const BTN_PELIGRO_SISTEMA =
  `${BTN} border border-red-300 bg-superficie-elevada text-semaforo-error hover:bg-red-50 ` +
  'dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40'

/**
 * Clases para una tecla (`<kbd>`) en textos de ayuda. Vestida con tokens en D3: se acabaron
 * el tamaño en píxeles fuera de escala y las dos parejas `dark:` del gris frío que se
 * contradecían. Ahora es `caption` sobre la base neutra, y vale para los dos temas.
 */
export const KBD =
  'rounded-control border border-borde bg-superficie px-1 font-mono text-caption text-texto-secundario'

/**
 * Input/select DEL SISTEMA: el único de la app desde que D7 jubiló el heredado `INPUT`, que
 * en oscuro se vestía con el gris frío de la v1.8.0 y sobre el lienzo cálido se leía como una
 * mancha azul. El borde es `borde-fuerte`: es un contorno que delimita un control y debe
 * verse (3:1).
 *
 * NO LLEVA ANCHO, y es deliberado (D6). Lo llevaba (`w-full`), y era una trampa: en el CSS de
 * Tailwind `w-full` va DESPUÉS de las anchuras numéricas, así que `${INPUT_SISTEMA} w-56` no
 * hacía nada y el control salía a ancho completo sin que nadie se enterara. Ahora el ancho lo
 * pone quien lo usa: `Field` añade `w-full` (que es donde el ancho completo SÍ es lo
 * correcto: un campo de formulario ocupa su columna) y quien quiera otro escribe `w-56` y lo
 * obtiene. Un input suelto SIN clase de ancho se encoge a su tamaño natural.
 */
export const INPUT_SISTEMA =
  'rounded-control border border-borde-fuerte bg-superficie-elevada px-2.5 py-1.5 text-cuerpo text-texto ' +
  'shadow-reposo focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60'

/** Anillo de foco del sistema: el mismo en todo lo que se puede pulsar. */
export const FOCO =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-superficie'

/** Une clases saltándose las vacías. */
export function cx(...partes: Array<string | false | undefined>): string {
  return partes.filter(Boolean).join(' ')
}

/* ────────────────────────────────────────────────────────────────────────────────────────
 * ESTRUCTURA DE PÁGINA
 * ──────────────────────────────────────────────────────────────────────────────────────── */

/** Cabecera de página: el único `<h1>` de la ruta, con su subtítulo y sus acciones. */
export function PageHeader({
  titulo,
  subtitulo,
  sobretitulo,
  acciones,
  idTitulo,
}: {
  titulo: ReactNode
  subtitulo?: ReactNode
  /** Rótulo pequeño POR ENCIMA del título (sección, ejercicio, marca). Opcional. */
  sobretitulo?: ReactNode
  /** Botones de la esquina derecha. Se apilan bajo el título si no caben. */
  acciones?: ReactNode
  /**
   * `id` del `<h1>`, para que una lista o una región de la página pueda apuntarle con
   * `aria-labelledby` y tomar prestado su nombre en vez de repetirlo (Posiciones lo hace con
   * su lista de posiciones). Nace en D7: la página no debe maquetarse su propio título para
   * poder etiquetarlo (regla C).
   */
  idTitulo?: string
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 space-y-1">
        {sobretitulo && (
          <p className="text-caption font-semibold uppercase tracking-widest text-texto-acento">
            {sobretitulo}
          </p>
        )}
        <h1 id={idTitulo} className="text-pagina font-bold tracking-tight text-texto">
          {titulo}
        </h1>
        {subtitulo && (
          <p className="text-cuerpo text-texto-secundario">{subtitulo}</p>
        )}
      </div>
      {acciones && <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  )
}

/**
 * Tarjeta: el contenedor del sistema. Con `titulo` gana banda de cabecera; con `onClick`
 * se convierte en un botón entero (el área de clic es toda la tarjeta, no un enlace).
 *
 * Clicable, TODO su interior es un `<span>`: el modelo de contenido de `<button>` solo
 * admite phrasing, así que un `<h3>` dentro se lo comen las ayudas técnicas (pierde el rol
 * de encabezado y no cuenta para el esquema de la página) y un `<div>` o un `<p>` son HTML
 * inválido. El título encabeza de verdad solo en la Card NO clicable, que es una `<section>`
 * y una tarjeta de navegación no debería sembrar encabezados sueltos en el esquema.
 */
export function Card({
  titulo,
  subtitulo,
  acciones,
  tono = 'normal',
  relleno = 'normal',
  onClick,
  as: Elemento = 'section',
  className,
  children,
  ...resto
}: {
  titulo?: ReactNode
  subtitulo?: ReactNode
  /** Acciones de la cabecera. Solo con `titulo`, y nunca en una tarjeta clicable. */
  acciones?: ReactNode
  /** `acento` la tiñe con el realce de marca; se usa con cuentagotas (regla D). */
  tono?: 'normal' | 'acento'
  /**
   * `sin` para meter dentro una `Tabla`, que ya trae su propio relleno; `compacto` afina el
   * relleno (12 px) para barras de herramientas densas, donde el aire de `normal` (16 px) sobra.
   */
  relleno?: 'normal' | 'sin' | 'compacto'
  onClick?: () => void
  /**
   * Elemento que pinta la Card NO clicable (`section` por defecto): `article` cuando la
   * tarjeta es una pieza autocontenida que los tests o las ayudas técnicas buscan por ese
   * rol (contrato de PanelAutocorreccion), `li` cuando la tarjeta vive en una lista.
   * Con `onClick` se ignora: la tarjeta clicable es siempre un `<button>`.
   */
  as?: 'section' | 'article' | 'li' | 'div'
  className?: string
  children?: ReactNode
} & Pick<React.HTMLAttributes<HTMLElement>, 'id' | 'role' | 'aria-live' | 'aria-labelledby'> & {
  /**
   * Ancla de la visita guiada (`src/ui/visita/`): marca esta tarjeta como el elemento que
   * la visita ilumina al hablar de ella. Es un atributo de DATO, no de estilo, y por eso
   * llega hasta el DOM. Los valores válidos están en `ANCLAS`.
   */
  'data-visita'?: string
}) {
  const base = cx(
    'rounded-panel border shadow-reposo transition-[border-color,box-shadow,transform] duration-200',
    tono === 'acento'
      ? 'border-borde-acento bg-superficie-acento'
      : 'border-borde bg-superficie-elevada',
  )
  const cuerpo =
    relleno === 'sin'
      ? ''
      : relleno === 'compacto'
        ? titulo
          ? 'px-3 pb-3 pt-2.5'
          : 'p-3'
        : titulo
          ? 'px-4 pb-4 pt-3'
          : 'p-4'

  // Clicable → todo el subárbol es phrasing (`<span>` con display explícito). No → los
  // elementos semánticos de siempre (`<h3>`, `<p>`, `<div>`).
  const clicable = !!onClick
  const Caja = clicable ? 'span' : 'div'
  const Titulo = clicable ? 'span' : 'h3'
  const Sub = clicable ? 'span' : 'p'

  const cabecera = titulo && (
    <Caja
      className={cx(
        'flex flex-wrap items-start justify-between gap-x-4 gap-y-1',
        relleno === 'sin' && 'px-4 pt-3',
        // Sin cuerpo, la cabecera ES la tarjeta: no deja hueco debajo.
        children ? 'mb-3' : relleno === 'sin' ? 'pb-3' : '',
      )}
    >
      <Caja className="block min-w-0">
        <Titulo className="block text-titulo font-semibold tracking-tight text-texto">
          {titulo}
        </Titulo>
        {subtitulo && (
          <Sub className="mt-0.5 block text-apoyo text-texto-secundario">
            {subtitulo}
          </Sub>
        )}
      </Caja>
      {acciones && <span className="flex shrink-0 items-center gap-2">{acciones}</span>}
    </Caja>
  )

  if (clicable) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cx(
          base,
          'group block w-full text-left transition-colors',
          'hover:border-borde-acento hover:bg-superficie-acento',
          FOCO,
          className,
        )}
        {...resto}
      >
        <span className={cx('block', cuerpo || 'p-4')}>
          {cabecera}
          {children}
        </span>
      </button>
    )
  }

  return (
    <Elemento className={cx(base, className)} {...resto}>
      <div className={cuerpo}>
        {cabecera}
        {children}
      </div>
    </Elemento>
  )
}

/* ────────────────────────────────────────────────────────────────────────────────────────
 * DATOS
 * ──────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Tabla del sistema: densidad con aire, cabecera diferenciada y hover de fila, aplicados
 * al marcado que le pases. NO cambia la estructura —`<thead>`, `<tbody>`, `<caption>`, ARIA
 * y virtualización siguen siendo de quien la usa (contrato P8 del Diario)—: solo la viste.
 *
 * Los números van a la derecha marcando la celda con `data-num`, no con una clase que haya
 * que acordarse de escribir; `tabular-nums` es propiedad de la tabla entera.
 */
export function Tabla({
  densidad = 'comoda',
  className,
  contenedorRef,
  contenedorClassName,
  contenedorProps,
  children,
  ...tabla
}: {
  /** `comoda` (por defecto) para leer; `compacta` solo cuando la fila sea un dato mínimo. */
  densidad?: 'comoda' | 'compacta'
  className?: string
  /**
   * Ref del CONTENEDOR de scroll (el `<div>` con overflow, no la `<table>`). Con él, ese
   * mismo div es el `scrollElement` de un virtualizador y el que puede llevar el `onKeyDown`
   * de la navegación por teclado (contrato P8 del Diario): así no se anidan dos scrollers —el
   * de la envoltura y el de la página—, que era la trampa de esta fase.
   */
  contenedorRef?: React.Ref<HTMLDivElement>
  /** Alto y scroll VERTICAL propios de una tabla virtualizada: p. ej. `max-h-[70vh] overflow-y-auto`. */
  contenedorClassName?: string
  /** Props extra del contenedor: el `onKeyDown` de las flechas del Diario y poco más. */
  contenedorProps?: React.HTMLAttributes<HTMLDivElement>
  children: ReactNode
} & React.TableHTMLAttributes<HTMLTableElement>) {
  // Las cadenas van LITERALES y completas: Tailwind lee el fichero como texto y una clase
  // compuesta con plantillas (`[&_td]:${x}`) no llegaría nunca al CSS.
  const relleno =
    densidad === 'comoda'
      ? '[&_tbody_td]:px-3 [&_tbody_td]:py-2.5 [&_tbody_th]:px-3 [&_tbody_th]:py-2.5'
      : '[&_tbody_td]:px-3 [&_tbody_td]:py-1.5 [&_tbody_th]:px-3 [&_tbody_th]:py-1.5'
  return (
    <div
      ref={contenedorRef}
      className={cx(
        // `relative` no es decorativo: un `sr-only` (posición absoluta) dentro de la tabla
        // necesita que ESTE contenedor sea su bloque contenedor. Sin él, su posición se
        // resuelve contra el viewport, se salta el recorte del overflow y estira el
        // scrollWidth de la página entera (lo cazó responsive.spec en Trazabilidad, D6).
        'relative overflow-x-auto rounded-panel border border-borde bg-superficie-elevada shadow-reposo',
        contenedorClassName,
      )}
      {...contenedorProps}
    >
      <table
        className={cx(
          'w-full border-collapse text-cuerpo tabular-nums text-texto',
          '[&_caption]:px-3 [&_caption]:py-2 [&_caption]:text-left [&_caption]:text-apoyo [&_caption]:text-texto-secundario',
          '[&_thead_th]:border-b [&_thead_th]:border-borde [&_thead_th]:bg-superficie [&_thead_th]:px-3 [&_thead_th]:py-2 [&_thead_th]:text-left [&_thead_th]:align-bottom',
          '[&_thead_th]:text-caption [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-wide [&_thead_th]:text-texto-mudo',
          // Las filas de relleno de la virtualización son `<tr aria-hidden>`: ni borde ni hover.
          '[&_tbody_tr:not([aria-hidden])]:border-t [&_tbody_tr:not([aria-hidden])]:border-borde [&_tbody_tr:not([aria-hidden]):hover]:bg-superficie',
          '[&_tbody_th]:text-left [&_tbody_th]:font-medium',
          // Pie de totales: la misma raya doble que separaba el resumen de sus filas, ahora
          // del sistema. El peso de la fila (`font-semibold`) lo pone quien la usa en el
          // `<tfoot>`, para que una celda suelta pueda volver a `font-normal` si hace falta.
          '[&_tfoot]:border-t-2 [&_tfoot]:border-borde-fuerte [&_tfoot_td]:px-3 [&_tfoot_td]:py-2 [&_tfoot_th]:px-3 [&_tfoot_th]:py-2',
          relleno,
          '[&_[data-num]]:text-right',
          className,
        )}
        {...tabla}
      >
        {children}
      </table>
    </div>
  )
}

/** Cifra grande con su etiqueta y, si hace falta, una línea de apoyo. */
export function Stat({
  etiqueta,
  valor,
  unidad,
  apoyo,
}: {
  etiqueta: ReactNode
  valor: ReactNode
  /** Se pinta pegada a la cifra, en pequeño: «apuntes», «€», «BTC». */
  unidad?: ReactNode
  /** Segunda línea, para el matiz: «de los cuales 12 sin justificante». */
  apoyo?: ReactNode
}) {
  return (
    <div className="space-y-0.5">
      {/* La etiqueta va en `texto-secundario`, no en `texto-mudo`: sobre `superficie-acento`
          —la Card de la cifra principal de Cartera— el gris apagado se queda en 4,41:1 y no
          llega a AA, cosa que el propio `tailwind.config.js` avisa junto al token. Y el
          rótulo de una cifra grande no es un pie: se lee, aunque sea después (D7). */}
      <dt className="text-caption font-semibold uppercase tracking-wide text-texto-secundario">
        {etiqueta}
      </dt>
      <dd className="flex items-baseline gap-1.5">
        <span className="text-cifra font-bold tabular-nums tracking-tight text-texto">{valor}</span>
        {unidad && <span className="text-apoyo text-texto-secundario">{unidad}</span>}
      </dd>
      {apoyo && <p className="text-apoyo text-texto-secundario">{apoyo}</p>}
    </div>
  )
}

/** Etiqueta corta de estado. Los tonos del semáforo son los del cuadre (DOMINIO §4). */
export function Chip({
  tono = 'neutro',
  soloIcono = false,
  children,
  titulo,
  'aria-label': ariaLabel,
}: {
  tono?: 'neutro' | 'brand' | 'ok' | 'revisar' | 'error'
  /**
   * Reduce el chip a un punto redondo de 20 px con solo su icono, para tablas densas (la
   * columna de sello del Diario). El texto que se pierde va en `aria-label`.
   */
  soloIcono?: boolean
  children: ReactNode
  /** `title` nativo, para la explicación larga de un sello. */
  titulo?: string
  'aria-label'?: string
}) {
  // El semáforo lleva su pareja `dark:` aquí no por contraste —desde D7 `semaforo-*` es un
  // token de tema y ya se aclara solo—, sino porque el Chip pinta ADEMÁS su propio fondo de
  // color: sobre `green-950/40` el tono que se lee mejor es el 300, no el 400 del token.
  const tonos = {
    neutro: 'border-borde bg-superficie text-texto-secundario',
    brand: 'border-borde-acento bg-superficie-acento text-texto-acento',
    ok: 'border-green-300 bg-green-50 text-semaforo-ok dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300',
    revisar:
      'border-amber-300 bg-amber-50 text-semaforo-revisar dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
    error:
      'border-red-300 bg-red-50 text-semaforo-error dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300',
  }[tono]
  return (
    <span
      title={titulo}
      aria-label={ariaLabel}
      className={cx(
        'inline-flex items-center rounded-pildora border text-caption font-medium',
        soloIcono ? 'h-5 w-5 justify-center' : 'gap-1 px-2.5 py-0.5',
        tonos,
      )}
    >
      {children}
    </span>
  )
}

/** Estado vacío: por qué no hay nada y qué hacer al respecto. */
export function EmptyState({
  icono,
  titulo,
  descripcion,
  accion,
}: {
  /** Un carácter o un SVG. Decorativo: se marca `aria-hidden`. */
  icono?: ReactNode
  titulo: ReactNode
  descripcion?: ReactNode
  accion?: ReactNode
}) {
  return (
    <div className="rounded-panel border border-dashed border-borde bg-superficie-elevada px-4 py-8 text-center">
      {icono && (
        <div aria-hidden="true" className="mb-2 text-titulo text-texto-mudo">
          {icono}
        </div>
      )}
      <p className="text-cuerpo font-semibold text-texto">{titulo}</p>
      {descripcion && (
        <p className="mx-auto mt-1 text-apoyo text-texto-secundario">{descripcion}</p>
      )}
      {accion && <div className="mt-3 flex justify-center gap-2">{accion}</div>}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────────────────────
 * FORMULARIO
 * ──────────────────────────────────────────────────────────────────────────────────────── */

/**
 * ¿Declara ya esta cadena de clases un ancho propio (`w-40`, `w-auto`, `w-full`…)? El `(^|\s)`
 * evita confundirlo con `max-w-lectura`, que no es un ancho de caja sino un tope de medida.
 */
function declaraAncho(clases: string | undefined): boolean {
  return !!clases && /(^|\s)w-\S/.test(clases)
}

/** Las clases del control de un `Field`, con `w-full` salvo que traiga ancho propio. */
function conAnchoPorDefecto(clases: string | undefined): string {
  return declaraAncho(clases) ? clases! : cx('w-full', clases)
}

/**
 * Campo de formulario: etiqueta + control + ayuda + error, con el `id` y los `aria-*`
 * cableados solos. Envuelve el control que le pases (normalmente un `INPUT_SISTEMA`).
 */
export function Field({
  etiqueta,
  ayuda,
  error,
  requerido,
  children,
}: {
  etiqueta: ReactNode
  /** Texto de apoyo permanente: formato esperado, unidad, de dónde sale el dato. */
  ayuda?: ReactNode
  /** Si viene, el campo se marca inválido y la ayuda pasa a segundo plano. */
  error?: ReactNode
  requerido?: boolean
  children: ReactNode
}) {
  const id = useId()
  const idAyuda = ayuda ? `${id}-ayuda` : undefined
  const idError = error ? `${id}-error` : undefined
  const descrito = [idError, idAyuda].filter(Boolean).join(' ') || undefined

  // Se cablea el único hijo elemento: así la pantalla escribe `<input className={INPUT_SISTEMA} />`
  // a secas y no tiene que acordarse del `id`, del `aria-describedby` ni del `aria-invalid`.
  // Y se le da el ANCHO por defecto: en un campo de formulario el control ocupa su columna,
  // que es justo el caso en el que `w-full` es lo correcto (D6: `INPUT_SISTEMA` ya no lo
  // trae). Si el hijo declara su propio ancho (`w-40`, `w-auto`…), manda el suyo: añadir
  // `w-full` lo pisaría, porque en el CSS de Tailwind va después de las anchuras numéricas.
  const solo = Children.count(children) === 1 ? Children.only(children) : null
  const control =
    solo && isValidElement(solo)
      ? cloneElement(solo as ReactElement<Record<string, unknown>>, {
          id: (solo.props as Record<string, unknown>).id ?? id,
          className: conAnchoPorDefecto(
            (solo.props as Record<string, unknown>).className as string | undefined,
          ),
          'aria-describedby':
            (solo.props as Record<string, unknown>)['aria-describedby'] ?? descrito,
          'aria-invalid': (solo.props as Record<string, unknown>)['aria-invalid'] ?? !!error,
        })
      : children

  return (
    <div className="space-y-1">
      {/* El asterisco es HERMANO de la `<label>`, no hijo: así el texto de la etiqueta es
          exactamente el rótulo y el nombre accesible del control (vía `htmlFor`) coincide con
          lo que se lee, sin que la marca de obligatorio se cuele en él (contrato D4). */}
      <div className="flex items-center gap-0.5">
        <label htmlFor={id} className="text-apoyo font-medium text-texto">
          {etiqueta}
        </label>
        {requerido && (
          <span aria-hidden="true" className="text-texto-acento">
            *
          </span>
        )}
      </div>
      {control}
      {error && (
        <p id={idError} className="text-apoyo text-semaforo-error dark:text-red-400">
          {error}
        </p>
      )}
      {ayuda && (
        <p id={idAyuda} className="text-apoyo text-texto-secundario">
          {ayuda}
        </p>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────────────────────
 * CAPAS Y AVISOS
 * ──────────────────────────────────────────────────────────────────────────────────────── */

/** Elementos que pueden recibir el foco dentro del diálogo, en orden de tabulación. */
function focosDe(cont: HTMLElement | null): HTMLElement[] {
  if (!cont) return []
  const sel =
    'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),' +
    'select:not([disabled]),[tabindex]:not([tabindex="-1"])'
  return Array.from(cont.querySelectorAll<HTMLElement>(sel)).filter(
    // Descarta lo que está oculto (sin caja de layout). `offsetParent` es null para
    // `display:none`; el diálogo en sí siempre tiene caja.
    (el) => el.offsetParent !== null || el === document.activeElement,
  )
}

/**
 * Ventana modal accesible. Cierra con Escape y con clic en el fondo, atrapa el foco con Tab
 * mientras está abierta (D4) y, al cerrarse, DEVUELVE el foco a quien lo tenía antes de abrir.
 *
 * Esa devolución es la misma que el Diario ya hace a mano al cerrar la ficha de un apunte
 * (DiarioPage: `enfocarFila`), porque quien abre pinchando o con Enter una fila deja el foco
 * EN esa fila: ambas apuntan al mismo sitio, así que el teclado del Diario no se pierde
 * (camino-critico.spec.ts). La trampa vive en un solo efecto tecleado por `abierto` —no por
 * `onCerrar`, que cambia en cada render del padre—, con `onCerrar` leído desde un ref, para
 * no re-atrapar el foco en cada pulsación del formulario.
 */
export function Modal({
  titulo,
  abierto,
  onCerrar,
  children,
  ancho = 'max-w-lg',
}: {
  titulo: string
  abierto: boolean
  onCerrar: () => void
  children: ReactNode
  ancho?: string
}) {
  const dialogoRef = useRef<HTMLDivElement>(null)
  const previoRef = useRef<HTMLElement | null>(null)
  const onCerrarRef = useRef(onCerrar)
  onCerrarRef.current = onCerrar

  useEffect(() => {
    if (!abierto) return
    // Quién tenía el foco al abrir: se le devolverá al cerrar.
    previoRef.current = document.activeElement as HTMLElement | null
    // Foco inicial en el propio diálogo (tabIndex -1); Tab entra luego en su contenido.
    dialogoRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCerrarRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const focos = focosDe(dialogoRef.current)
      if (focos.length === 0) {
        e.preventDefault()
        dialogoRef.current?.focus()
        return
      }
      const primero = focos[0]!
      const ultimo = focos[focos.length - 1]!
      const activo = document.activeElement
      if (e.shiftKey) {
        if (activo === primero || activo === dialogoRef.current) {
          e.preventDefault()
          ultimo.focus()
        }
      } else if (activo === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      // Devuelve el foco a quien lo tenía, si sigue en el documento. En el Diario coincide
      // con la fila que `enfocarFila` reenfoca; enfocar dos veces el mismo nodo es inocuo.
      const previo = previoRef.current
      if (previo && previo.isConnected && typeof previo.focus === 'function') previo.focus()
    }
  }, [abierto])

  if (!abierto) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-900/50 p-4 dark:bg-stone-950/70 sm:p-8"
      onClick={onCerrar}
    >
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        className={cx(
          'w-full rounded-panel border border-borde bg-superficie-elevada shadow-elevada outline-none',
          ancho,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-borde px-5 py-3">
          <h2 className="text-titulo font-semibold tracking-tight text-texto">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className={cx(
              'rounded-control p-1 text-texto-mudo hover:bg-superficie hover:text-texto',
              FOCO,
            )}
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

/**
 * Banner de aviso. Cinco tonos: los tres del semáforo (info, éxito, error), el realce de
 * marca del manual y el neutro, que es donde van a parar las cajas de color sin bando.
 */
export function Banner({
  tono,
  children,
  onCerrar,
}: {
  tono: 'info' | 'exito' | 'error' | 'manual' | 'neutro'
  children: ReactNode
  onCerrar?: () => void
}) {
  // Los tres primeros conservan sus clases LITERALES de la v1.8.0: los usan 23 ficheros y
  // en D1 no cambian de aspecto. Los dos nuevos ya salen de los tokens del sistema.
  //
  // ANCHO. El recuadro ocupa el ancho de su contenedor y CADA RENGLÓN LO LLENA, sin tope de
  // medida y alineado a la izquierda. Decisión del autor, sostenida en tres vueltas:
  //
  //   27-8-2026 · se rechazan acotar el texto a 66 ch alineado a la izquierda (dejaba 839 px
  //               de hueco a un lado dentro del marco teñido) y ceñir la caja con `w-fit`.
  //   29-8-2026 · se prueba la tercera salida —columna acotada pero CENTRADA, con margen
  //               simétrico— y también se rechaza: «no quiero que haya tanto hueco».
  //
  // Conclusión: lo que fallaba no era la medida de la línea, era el AIRE. El relleno sube de
  // 12 px a 16/20 px, que es lo que despega el texto del marco a 1.120 px de caja; la línea se
  // queda como estaba. No volver a proponer acotar ni centrar el contenido de este componente:
  // las tres salidas están probadas sobre la página real. Ver `docs/DISENO_DIAGNOSTICO.md` §7.5.
  const clases = {
    info: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200',
    exito: 'border-green-300 bg-green-50 text-green-900 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-200',
    error: 'border-red-300 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200',
    manual: 'border-borde-acento bg-superficie-acento text-texto',
    neutro: 'border-borde bg-superficie-elevada text-texto-secundario',
  }[tono]
  return (
    <div
      role="status"
      className={`flex items-start justify-between gap-3 rounded-panel border px-4 py-3 text-cuerpo sm:px-5 ${clases}`}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {onCerrar && (
        <button type="button" onClick={onCerrar} aria-label="Descartar aviso" className="shrink-0 opacity-60 hover:opacity-100">
          ✕
        </button>
      )}
    </div>
  )
}
