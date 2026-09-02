/**
 * instalacion.ts — «instalar el Libro» como aplicación, y saber si ya lo está.
 *
 * Por qué hace falta un módulo y no basta un botón. La app es una PWA completa desde hace
 * versiones —manifiesto `standalone`, iconos, service worker que precachea el build entero—,
 * o sea que el navegador YA ofrece instalarla: icono propio, ventana sin barra de direcciones
 * y funcionamiento en modo avión. Lo que faltaba era decírselo a alguien. Nadie mira el menú
 * del navegador buscando «instalar», y para el alumno la diferencia entre «una web del taller»
 * y «mi programa de contabilidad» es exactamente esa.
 *
 * La trampa técnica que obliga a un módulo: `beforeinstallprompt` se dispara UNA vez y muy
 * pronto —a menudo antes de que React haya montado nada—. Si se escucha dentro de un
 * componente, el evento ya ha pasado y el botón no aparece nunca. Por eso el oyente se
 * registra al importar el módulo (lo hace `main.tsx`, antes de pintar) y el evento se guarda
 * aquí; los componentes solo se suscriben a lo guardado.
 *
 * Y el caso que se olvida siempre: **Safari no implementa `beforeinstallprompt`**. En iPhone
 * y iPad ese evento no llega JAMÁS, así que un botón que dependa de él no se pinta nunca y el
 * alumno de iPad no se entera de que puede instalarla. Para ese caso el estado es
 * `manual-ios` y la pantalla enseña los pasos a mano (Compartir → Añadir a pantalla de inicio).
 *
 * Local-first (Regla de oro 3): aquí no se llama a nada externo. Todo es API del navegador.
 */
import { useSyncExternalStore } from 'react'

/** El evento de Chromium, que el estándar todavía no define en lib.dom. */
interface EventoInstalacion extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * En qué situación está la instalación:
 *  · `instalada`     — ya se abre como aplicación; no hay nada que ofrecer.
 *  · `instalable`    — el navegador ha ofrecido instalarla y tenemos el evento guardado.
 *  · `manual-ios`    — iPhone/iPad: se puede, pero solo a mano y solo desde Safari.
 *  · `no-disponible` — ni instalada ni instalable (Firefox de escritorio, o ya descartada).
 */
export type EstadoInstalacion = 'instalada' | 'instalable' | 'manual-ios' | 'no-disponible'

let evento: EventoInstalacion | null = null
let instaladaAhora = false
const oyentes = new Set<() => void>()

function avisar(): void {
  for (const o of oyentes) o()
}

/** ¿La ventana actual es ya la app instalada? */
function abiertaComoApp(): boolean {
  try {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true
    // Safari en iOS no usa `display-mode`: lo dice en una propiedad suya de `navigator`.
    return (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  } catch {
    return false
  }
}

/** ¿Es un iPhone o un iPad? (donde `beforeinstallprompt` no existe y hay que explicarlo). */
function esIOS(): boolean {
  const ua = window.navigator.userAgent
  // El iPad moderno se anuncia como Macintosh; se distingue porque tiene pantalla táctil.
  return /iphone|ipod|ipad/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
}

/**
 * Registra los oyentes del navegador. Idempotente y a prueba de entornos sin `window`
 * (los tests del motor corren en Node). Lo llama `main.tsx` ANTES de pintar, porque
 * `beforeinstallprompt` no espera a React.
 */
export function escucharInstalacion(): void {
  if (typeof window === 'undefined') return
  instaladaAhora = abiertaComoApp()

  window.addEventListener('beforeinstallprompt', (e) => {
    // Sin `preventDefault` el navegador enseñaría su propio aviso; queremos el nuestro,
    // en su sitio y con nuestras palabras.
    e.preventDefault()
    evento = e as EventoInstalacion
    avisar()
  })

  window.addEventListener('appinstalled', () => {
    evento = null
    instaladaAhora = true
    avisar()
  })
}

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

function leer(): EstadoInstalacion {
  if (instaladaAhora || abiertaComoApp()) return 'instalada'
  if (evento) return 'instalable'
  if (esIOS()) return 'manual-ios'
  return 'no-disponible'
}

/** Hook: en qué situación está la instalación, reactivo. */
export function useEstadoInstalacion(): EstadoInstalacion {
  return useSyncExternalStore(suscribir, leer, () => 'no-disponible')
}

/**
 * Lanza el diálogo del navegador. Devuelve `true` si el alumno aceptó.
 *
 * El evento se consume: una vez usado, el navegador no lo vuelve a emitir en esta carga, así
 * que se descarta pase lo que pase (si dijo que no, no se le insiste).
 */
export async function instalar(): Promise<boolean> {
  const e = evento
  if (!e) return false
  evento = null
  avisar()
  await e.prompt()
  const { outcome } = await e.userChoice
  return outcome === 'accepted'
}
