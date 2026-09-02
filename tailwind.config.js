import plugin from 'tailwindcss/plugin'

/*
 * SISTEMA DE DISEÑO (fase D1 de docs/ENCARGO_DISENO_UI.md).
 *
 * Este fichero es la ley. Desde D1, la regla C del encargo prohíbe el valor suelto: ni un
 * hex fuera de la paleta, ni un tamaño fuera de la escala, ni un gris que no sea de la base
 * neutra. Si una pantalla necesita algo que no esté aquí, se AMPLÍA el sistema y luego se
 * usa; nunca al revés.
 *
 * Cada token lleva al lado su REGLA DE USO. Las fases D2–D6 la siguen al pie de la letra;
 * cuando se dude entre dos tokens, manda el comentario, no el parecido visual.
 *
 * ── La base neutra es `stone`, y solo `stone` ────────────────────────────────────────────
 * El diagnóstico (docs/DISENO_DIAGNOSTICO.md §2) encontró la base partida en dos: 740
 * clases `slate` (frío) contra 205 `stone` (cálido), y 401 de las `slate` aplicadas en modo
 * claro, sobre un lienzo `stone-50`. Dos familias de gris en el mismo golpe de vista.
 *
 * Se elige **stone**: es la que declaraba la intención de la identidad (naranja bitcoin
 * sobre neutro cálido), la que ya usan Inicio, Cartera y Casos, y la que casa con el acento.
 * `slate` queda PROSCRITO en `src/ui/`. Las pantallas aún sin migrar lo siguen usando —se
 * limpian en su fase—, pero ningún token nuevo, ningún componente nuevo y ninguna pantalla
 * ya migrada puede escribir `slate`.
 *
 * ── AA de serie ──────────────────────────────────────────────────────────────────────────
 * Cada par texto/fondo de este fichero pasa 4,5:1 (3:1 en texto grande y en el contorno de
 * los controles), medido y anotado abajo. Ya no hay red de seguridad debajo: las 20
 * utilidades que `src/index.css` redefinía por contraste se borraron en D7, y los dos últimos
 * casos que las necesitaban —el semáforo y el hover de los enlaces— son desde entonces tokens
 * de tema como los demás. Una clase pinta lo que su nombre dice.
 *
 * ── Claro y oscuro en una sola clase ─────────────────────────────────────────────────────
 * Los colores semánticos son variables CSS declaradas abajo en `:root` y `:root.dark` (el
 * tema es la clase `dark` de <html>, `src/ui/tema.ts`). Por eso `bg-superficie` ya pinta
 * bien en los dos temas y no hace falta escribir la pareja `… dark:…` en cada sitio. Se
 * guardan como tripletes `R G B` para que los modificadores de opacidad (`/90`, `/60`)
 * sigan funcionando.
 *
 * ── El ritmo de espaciado ────────────────────────────────────────────────────────────────
 * No hay escala propia: la de Tailwind (múltiplos de 4 px) ya es coherente y una paralela
 * solo añadiría un nombre por número. Lo que sí hay es REGLA, y las fases D2–D6 la siguen:
 * dentro de un bloque `2` (8 px) o `3` (12 px); relleno de tarjeta `4` (16 px); separación
 * entre bloques `6` (24 px); entre secciones de una página `8` (32 px). Los rellenos de
 * celda no se escriben a mano: los pone `Tabla` (`src/ui/comp.tsx`), que para eso existe —
 * el diagnóstico contó 22 combinaciones distintas (§3).
 */

/** Paleta neutra de referencia (stone de Tailwind), para leer los comentarios sin salir. */
// 50 #fafaf9 · 100 #f5f5f4 · 200 #e7e5e4 · 300 #d6d3d1 · 400 #a8a29e · 500 #78716c
// 600 #57534e · 700 #44403c · 800 #292524 · 900 #1c1917 · 950 #0c0a09

/**
 * Valor de cada color semántico en los dos temas, como triplete `R G B`.
 *
 * Es la ÚNICA fuente de verdad: el plugin de abajo las escribe como variables CSS y
 * `theme.colors` las consume. Cambiar un tono aquí lo cambia en toda la app.
 */
const SEMANTICOS = {
  claro: {
    /* superficie · el lienzo de la página: el fondo sobre el que se apoya todo lo demás.
       NO se pinta en tarjetas ni en filas. stone-50. */
    superficie: '250 250 249',
    /* superficie-elevada · lo que se apoya EN el lienzo y hay que poder recortar con la
       vista: tarjeta, panel, modal, cabecera pegajosa, fila de tabla. Blanco. */
    'superficie-elevada': '255 255 255',
    /* superficie-acento · realce de marca, nunca fondo masivo (regla D del encargo):
       el recuadro «Unidad del manual», el chip brand, la fila resaltada. brand-50.
       OJO: sobre este fondo el texto mínimo es `texto-secundario` (7,01:1); `texto-mudo`
       se queda en 4,41:1 y no vale. */
    'superficie-acento': '253 244 232',
    /* borde · separación DECORATIVA: contorno de tarjeta, línea entre filas, divisorias.
       No delimita ningún control, así que la WCAG no le exige 3:1. stone-200. */
    borde: '231 229 228',
    /* borde-fuerte · el contorno que SÍ delimita un control y hay que ver: input, select,
       botón secundario, celda editable. stone-500 → 4,59:1 sobre `superficie` y 4,80:1
       sobre `superficie-elevada` (exige 3:1). */
    'borde-fuerte': '120 113 108',
    /* borde-acento · contorno de un realce de marca (Banner «manual», chip brand,
       tarjeta enfocada). brand-200. Decorativo, acompaña siempre a un texto que sí cumple. */
    'borde-acento': '246 209 158',
    /* texto · el texto que se lee: cuerpo, títulos, cifras. stone-900 → 16,74:1 sobre
       `superficie` y 17,49:1 sobre `superficie-elevada`. */
    texto: '28 25 23',
    /* texto-secundario · descripciones, subtítulos, ayuda de campo: se lee del todo, pero
       después. stone-600 → 7,30:1 / 7,63:1. */
    'texto-secundario': '87 83 78',
    /* texto-mudo · lo que solo se mira cuando se busca: unidades, sellos de fecha, pies,
       cabeceras de tabla. stone-500 → 4,59:1 / 4,80:1, justo por encima de AA. Es el suelo
       del sistema: NO existe un cuarto gris más tenue. */
    'texto-mudo': '120 113 108',
    /* texto-acento · texto interactivo y de marca: enlaces, botón de texto, la serie BTC.
       brand-600 → 4,81:1 sobre `superficie` y 5,02:1 sobre `superficie-elevada`. */
    'texto-acento': '180 83 9',
    /* texto-acento-fuerte · el MISMO enlace, al pasar el ratón por encima: un escalón más
       oscuro para que el hover se note sin cambiar de color. brand-700 → 6,86:1 sobre
       `superficie` y 7,16:1 sobre `superficie-elevada`. Nace en D7 para jubilar los ocho
       `hover:text-brand-700`, que en oscuro dependían de `index.css` para no quedarse en
       1,4:1 (un marrón sobre negro). 6,79:1 / 7,09:1. */
    'texto-acento-fuerte': '146 64 14',
    /* semaforo-* · el veredicto del cuadre (DOMINIO §4): verde OK, ámbar REVISAR, rojo
       ERROR. Son TOKENS DE TEMA desde D7, no colores fijos: sus tonos están calibrados para
       fondo claro y sobre el lienzo oscuro caían por debajo de AA, cosa que hasta ahora
       arreglaba `src/index.css` redefiniendo la utilidad por su nombre. Ahora el tono
       oscuro sale de aquí, y `text-semaforo-ok` vale en los dos temas sin pareja `dark:`.
       ok 4,80:1 / 5,02:1 · revisar 4,81:1 / 5,02:1 · error 6,19:1 / 6,47:1. */
    'semaforo-ok': '21 128 61',
    'semaforo-revisar': '180 83 9',
    'semaforo-error': '185 28 28',
  },
  oscuro: {
    /* stone-950 — el lienzo oscuro deja de ser slate-950 (#020617, negro azulado frío) y
       pasa a la misma base cálida que el resto. Es la decisión del punto 1 de D1. */
    superficie: '12 10 9',
    /* stone-900 — la elevación en oscuro no la da la sombra (no se ve), la da el tono:
       la tarjeta es un escalón MÁS CLARA que el lienzo, más el hilo de `borde`. */
    'superficie-elevada': '28 25 23',
    /* Marrón profundo de la familia brand: 1,43:1 sobre el lienzo y 1,27:1 sobre la
       tarjeta — se distingue como panel sin encender la pantalla. brand-200 encima da
       9,56:1 y stone-100, 12,67:1. */
    'superficie-acento': '58 42 18',
    /* stone-700 — en oscuro el hilo decorativo tiene que ser MÁS claro que su fondo
       (1,70:1 sobre la tarjeta); stone-800 se perdía. */
    borde: '68 64 60',
    /* stone-500 → 4,12:1 sobre el lienzo y 3,65:1 sobre la tarjeta (exige 3:1). Mismo tono
       que en claro: es el punto de la escala que cumple por los dos lados. */
    'borde-fuerte': '120 113 108',
    /* brand-700 — el acento en oscuro se apoya en el fondo `superficie-acento`, no grita. */
    'borde-acento': '146 64 14',
    /* stone-100 → 18,11:1 sobre el lienzo y 16,03:1 sobre la tarjeta. */
    texto: '245 245 244',
    /* stone-300 → 13,26:1 / 11,74:1. */
    'texto-secundario': '214 211 209',
    /* stone-400 → 7,83:1 / 6,93:1. En oscuro el gris apagado sube dos escalones: el mismo
       stone-500 del modo claro se quedaría en 3,6:1. */
    'texto-mudo': '168 162 158',
    /* brand-200 → 13,67:1 sobre el lienzo y 12,10:1 sobre la tarjeta. El brand-600 del modo
       claro está calibrado para fondo blanco y aquí caería a 1,9:1. */
    'texto-acento': '246 209 158',
    /* brand-100 → 16,49:1 / 14,60:1. En oscuro el hover ACLARA, que es como se sube un
       escalón cuando el fondo es negro. */
    'texto-acento-fuerte': '251 232 205',
    /* Los tres del semáforo, dos escalones más claros: ok 11,34:1 / 10,04:1 · revisar
       11,83:1 / 10,48:1 · error 7,14:1 / 6,32:1. Son exactamente los tonos que `index.css`
       inyectaba a mano; la diferencia es que ahora se leen aquí, con el resto del sistema. */
    'semaforo-ok': '74 222 128',
    'semaforo-revisar': '251 191 36',
    'semaforo-error': '248 113 113',
  },
}

/** `{ superficie: 'rgb(var(--superficie) / <alpha-value>)', … }` para `theme.colors`. */
const colorTokens = Object.fromEntries(
  Object.keys(SEMANTICOS.claro).map((n) => [n, `rgb(var(--${n}) / <alpha-value>)`]),
)

/** `{ '--superficie': '250 250 249', … }` para el bloque `:root` de cada tema. */
const variables = (tema) =>
  Object.fromEntries(Object.entries(SEMANTICOS[tema]).map(([n, v]) => [`--${n}`, v]))

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // El tema es una ELECCIÓN del alumno, no solo la preferencia del sistema: las variantes
  // `dark:` se activan con la clase `dark` en <html>, que gobierna `src/ui/tema.ts`.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Identidad visual (P9.1): naranja bitcoin como ACENTO, nunca como fondo masivo.
        // La escala NO cambia en D1; lo que cambia es que ahora hay tokens semánticos
        // (`texto-acento`, `superficie-acento`, `borde-acento`) que eligen por ti el tono
        // correcto en cada tema. Escribe `brand-*` a pelo solo cuando el tono importe de
        // verdad (la serie BTC de un gráfico es brand-500 en los dos temas).
        brand: {
          50: '#fdf4e8',
          100: '#fbe8cd',
          200: '#f6d19e', // texto de marca en OSCURO (12,10:1 sobre superficie-elevada)
          500: '#e8820c', // marcas, acentos, serie BTC
          600: '#b45309', // texto interactivo y botón sólido (5,02:1 sobre blanco)
          700: '#92400e',
        },
        ...colorTokens,
      },
      fontFamily: {
        sans: ['system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      /*
       * ESCALA TIPOGRÁFICA — siete pasos con su interlineado, y ni uno más.
       *
       * El diagnóstico contó once tamaños en pantalla y 24 usos de `text-[Npx]` sin
       * interlineado declarado (§1). Aquí cada paso es un PAPEL, no un número: si un texto
       * no encaja en ninguno de los siete, el problema es el texto, no la escala.
       *
       * Los tamaños de Tailwind (`text-sm`, `text-xs`…) siguen existiendo para las
       * pantallas sin migrar; en `src/ui/` migrado se usan estos.
       */
      fontSize: {
        // 11/16 — sellos, unidades de una cifra, pies, leyendas de gráfico. Nunca frases.
        caption: ['0.6875rem', { lineHeight: '1rem' }],
        // 12/18 — texto secundario denso: ayuda de campo, celda de tabla apretada, meta.
        apoyo: ['0.75rem', { lineHeight: '1.125rem' }],
        // 14/22 — el texto NORMAL de la app: botones, formularios, tablas, párrafos cortos.
        cuerpo: ['0.875rem', { lineHeight: '1.375rem' }],
        // 16/28 — LECTURA LARGA. Los literales del manual y las explicaciones legales
        // (Regla de oro 5) van aquí. Interlineado holgado a propósito: son párrafos de
        // 2.000 caracteres que hay que poder seguir con la vista. Lo que NO llevan es tope
        // de medida: la prosa va al ancho de su caja (decisión del autor, 29-8-2026; ver
        // el hueco donde estaba `maxWidth.lectura`, más abajo).
        lectura: ['1rem', { lineHeight: '1.75rem' }],
        // 18/24 — título de sección: <h2>, cabecera de Card, rótulo de bloque.
        titulo: ['1.125rem', { lineHeight: '1.5rem' }],
        // 24/30 — título de PÁGINA: el <h1> de PageHeader, uno por ruta y solo uno.
        pagina: ['1.5rem', { lineHeight: '1.875rem' }],
        // 30/34 — la cifra de un `Stat`, y nada más. Va siempre con `tabular-nums`.
        cifra: ['1.875rem', { lineHeight: '2.125rem' }],
      },
      /*
       * AQUÍ VIVÍA `maxWidth.lectura` (66ch), el tope de medida de la prosa. SE RETIRÓ el
       * 29-8-2026, con sus 60 usos, por decisión del autor: recorrió la app pantalla por
       * pantalla y en cada recuadro pidió lo mismo —«ajustar el texto al ancho del cuadro»,
       * «no quiero que haya tanto hueco»—. La prosa va ahora al ancho de su caja en toda la
       * app; lo que da aire es el RELLENO del contenedor (16/20 px), no un tope de línea.
       *
       * No reintroducirlo sin preguntar: la decisión está razonada y probada sobre la página
       * real en tres vueltas (27-8, 29-8 y el barrido final). Ver `DISENO_DIAGNOSTICO` §7.5.
       */
      borderRadius: {
        /*
         * TRES RADIOS PARA TRES PAPELES.
         *
         * El diagnóstico contó seis (`rounded-md` ×60, `rounded-lg` ×52, `rounded` ×30,
         * `rounded-full` ×26, `rounded-sm` ×2, `rounded-xl` ×1) para estos mismos tres.
         */
        // Lo que se pulsa o se escribe: botón, input, select, chip cuadrado, celda.
        control: '0.375rem',
        // Lo que contiene: Card, Banner, Modal, tabla, bloque del Panel.
        panel: '0.625rem',
        // Lo que es una etiqueta: Chip, sello KYC, el número redondo de un paso.
        pildora: '9999px',
      },
      boxShadow: {
        /*
         * DOS NIVELES DE ELEVACIÓN, NO MÁS.
         *
         * En OSCURO la sombra no se ve: ahí la elevación la da `superficie-elevada`, que es
         * un escalón más clara que el lienzo, más el hilo de `borde`. Por eso una tarjeta
         * lleva las dos cosas —sombra y borde— y no se elige entre ellas.
         */
        // Nivel 1 — apoyado en el lienzo: Card, input, botón secundario, fila destacada.
        reposo: '0 1px 2px 0 rgb(28 25 23 / 0.06), 0 1px 3px 0 rgb(28 25 23 / 0.05)',
        // Nivel 2 — flotando SOBRE el contenido: Modal, cabecera pegajosa, menú, popover.
        elevada: '0 4px 12px -2px rgb(28 25 23 / 0.10), 0 2px 6px -2px rgb(28 25 23 / 0.06)',
      },
    },
  },
  plugins: [
    /*
     * Las variables de color de los dos temas. Van en la capa `base` (antes que cualquier
     * utilidad) y se declaran aquí, y no en `src/index.css`, para que los valores y su
     * regla de uso vivan en un único fichero: el sistema se lee entero de un vistazo.
     */
    plugin(({ addBase }) => {
      addBase({
        ':root': variables('claro'),
        ':root.dark': variables('oscuro'),
      })
    }),
  ],
}
