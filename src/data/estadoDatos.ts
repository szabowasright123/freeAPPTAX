/**
 * estadoDatos.ts — el aviso de que NO SE PUDO LEER el Libro.
 *
 * El problema que resuelve, y por qué vive aquí y no en cada pantalla: diecisiete de las
 * diecinueve páginas leen sus datos con el patrón `estado === 'listo' ? datos : []`. Ese
 * `: []` mete en la misma rama dos cosas que no se parecen en nada —«todavía cargando» y
 * «la base ha fallado»— y pinta las dos igual: un Libro VACÍO. Para el alumno que lleva un
 * cuatrimestre registrando, un Libro vacío no se lee como un error de lectura; se lee como
 * «lo he perdido todo». Es el peor mensaje que puede dar esta app, y lo daba sin querer.
 *
 * La alternativa —tocar las diecisiete pantallas— era un diff enorme por un caso que casi
 * nunca ocurre. Así que el aviso sube al sistema: `useLiveQuery` apunta aquí cuando una
 * lectura falla, y la cabecera lo enseña UNA vez, encima de la página, diga lo que diga la
 * pantalla de debajo. Una sola verdad, un solo sitio donde escribirla.
 *
 * Módulo de la capa de datos: sin React salvo el hook de suscripción, sin Dexie, sin motor.
 */
import { useSyncExternalStore } from 'react'

/** Lo que se sabe del fallo: su mensaje y cuándo se vio por última vez. */
export interface FalloLectura {
  mensaje: string
  /** ISO local del primer fallo de esta racha (para no cambiar la referencia en cada tick). */
  desde: string
}

let fallo: FalloLectura | null = null
const oyentes = new Set<() => void>()

function avisar(): void {
  for (const o of oyentes) o()
}

/**
 * Registra que una lectura de la base falló. Idempotente: mientras dure la misma racha no
 * cambia la referencia, para no re-renderizar la cabecera en cada consulta que falle.
 */
export function registrarFalloLectura(err: unknown): void {
  const mensaje = err instanceof Error ? err.message : String(err)
  if (fallo && fallo.mensaje === mensaje) return
  fallo = { mensaje, desde: new Date().toISOString() }
  avisar()
}

/** Una lectura ha ido bien: se acabó la racha. */
export function limpiarFalloLectura(): void {
  if (fallo === null) return
  fallo = null
  avisar()
}

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

function leer(): FalloLectura | null {
  return fallo
}

/** Hook: el fallo de lectura vigente, o `null` si la base responde. */
export function useFalloLectura(): FalloLectura | null {
  // El mismo `leer` para servidor y cliente: aquí no hay SSR, pero el hook lo exige.
  return useSyncExternalStore(suscribir, leer, leer)
}
