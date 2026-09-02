import { useEffect, useState } from 'react'

/** Rutas de la edición gratuita: libro, archivo y utilidades locales. */
export type Ruta =
  | 'inicio'
  | 'diario'
  | 'archivo'
  | 'ajustes'
  | 'importar'
  | 'acerca'
  // Tipos heredados mientras se retiran físicamente los módulos docentes. No se
  // incluyen en VALIDAS ni en la navegación y, por tanto, no son accesibles.
  | 'panel'
  | 'cartera'
  | 'posiciones'
  | 'trazabilidad'
  | 'fiscal'
  | 'cierre'
  | 'taller'
  | 'autoevaluacion'
  | 'correccion'
  | 'revision'
  | 'entrega'
  | 'ubicaciones'
  | 'parametros'

export interface EntradaNav {
  ruta: Ruta
  etiqueta: string
}

export const RUTAS: EntradaNav[] = [
  { ruta: 'inicio', etiqueta: 'Inicio' },
  { ruta: 'diario', etiqueta: 'Libro' },
  { ruta: 'archivo', etiqueta: 'Archivo' },
  { ruta: 'ajustes', etiqueta: 'Ajustes' },
]

export const SUBRUTAS: Partial<Record<Ruta, EntradaNav[]>> = {
  ajustes: [
    { ruta: 'ajustes', etiqueta: 'Copias y ajustes' },
    { ruta: 'importar', etiqueta: 'Importar operaciones' },
  ],
}

const VALIDAS = new Set<Ruta>([
  ...RUTAS.map((r) => r.ruta),
  ...Object.values(SUBRUTAS).flatMap((subs) => (subs ?? []).map((s) => s.ruta)),
  'acerca',
])

export function rutaPrincipal(ruta: Ruta): Ruta | null {
  for (const { ruta: principal } of RUTAS) {
    if (principal === ruta) return principal
    if (SUBRUTAS[principal]?.some((sub) => sub.ruta === ruta)) return principal
  }
  return null
}

export function subrutasDe(ruta: Ruta): EntradaNav[] {
  const principal = rutaPrincipal(ruta)
  return (principal && SUBRUTAS[principal]) || []
}

export function etiquetaDe(ruta: Ruta): string {
  const principal = RUTAS.find((entrada) => entrada.ruta === ruta)
  if (principal) return principal.etiqueta
  for (const subs of Object.values(SUBRUTAS)) {
    const sub = subs?.find((entrada) => entrada.ruta === ruta)
    if (sub) return sub.etiqueta
  }
  return ruta === 'acerca' ? 'Acerca de' : ruta
}

function leerHash(): Ruta {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return VALIDAS.has(hash as Ruta) ? (hash as Ruta) : 'inicio'
}

export function llegoPorAlias(_nombre: string): boolean {
  return false
}

export function irA(ruta: Ruta): void {
  window.location.hash = `#/${ruta}`
}

export function useRuta(): Ruta {
  const [ruta, setRuta] = useState<Ruta>(leerHash)
  useEffect(() => {
    const actualizar = () => setRuta(leerHash())
    window.addEventListener('hashchange', actualizar)
    return () => window.removeEventListener('hashchange', actualizar)
  }, [])
  return ruta
}
